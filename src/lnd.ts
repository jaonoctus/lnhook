import crypto from 'node:crypto'
import axios from 'axios'
import bunyan from 'bunyan'
import {
  DecodePaymentRequestResult,
  GetInvoiceResult,
  authenticatedLndGrpc,
  cancelHodlInvoice,
  createHodlInvoice,
  decodePaymentRequest,
  getInvoice,
  pay,
  settleHodlInvoice,
  subscribeToInvoice,
  probeForRoute
} from 'lightning'
import { io } from './server'
import { env } from './env'

const log = bunyan.createLogger({ name: 'lnd' })

const { lnd } = authenticatedLndGrpc({
  cert: env.LND_CERT,
  macaroon: env.LND_MACAROON,
  socket: env.LND_HOST,
})

export async function validateInvoice(request: string) {
  try {
    const invoice = await decodePaymentRequest({ lnd, request })

    const now = Math.floor(new Date().getTime() / 1000)
    const expiresAt = new Date(invoice.expires_at).getTime() / 1000

    if (expiresAt > now) {
      return {
        isValid: true,
        invoice,
      }
    }

    log.warn({ invoice }, 'Invoice expired')
  } catch (error) {
    log.error({ error }, 'Error decoding invoice')
  }

  return {
    isValid: false,
    invoice: null,
  }
}

export async function wrapInvoice(
  invoice: DecodePaymentRequestResult,
  request: string,
  webhook?: string,
  metadata?: unknown
) {
  const { estimatedRoutingFee } = await estimateRoutingFee({ tokens: invoice.tokens, destination: invoice.destination })

  if (!estimatedRoutingFee) {
    throw new Error('No route found')
  }

  const originalAmount = invoice.tokens
  const serviceFee = Math.ceil(originalAmount * env.SERVICE_FEE_PERCENT)
  const finalAmount = originalAmount + estimatedRoutingFee + serviceFee
  const delta = invoice.cltv_delta || 80

  log.info({ id: invoice.id, originalAmount, finalAmount, estimatedRoutingFee, serviceFee, delta }, 'Route found')

  const { request: hodlRequest } = await createHodlInvoice({
    lnd,
    tokens: finalAmount,
    id: invoice.id,
    expires_at: invoice.expires_at,
    cltv_delta: delta + 40,
  })

  const sub = subscribeToInvoice({ lnd, id: invoice.id })

  sub.on('invoice_updated', async (hodlInvoice: GetInvoiceResult) => {
    if (hodlInvoice.is_canceled) {
      sub.removeAllListeners()

      if (webhook) {
        axios.post(webhook, {
          id: hodlInvoice.id,
          settled: false,
          preimage: null,
          metadata,
        })
      }

      return
    }

    if (hodlInvoice.is_held) {
      try {
        const { secret } = await pay({ lnd, request, max_fee: estimatedRoutingFee })
        await settleHodlInvoice({ lnd, secret })

        const computedId = crypto
            .createHash('sha256')
            .update(Buffer.from(secret, 'hex'))
            .digest('hex')

        const log = bunyan.createLogger({ name: 'lnd' })
        log.info({ id: hodlInvoice.id }, 'Invoice settled')

        const data = {
          id: hodlInvoice.id,
          settled: computedId === hodlInvoice.id,
          preimage: secret,
          metadata,
        }

        if (webhook) {
          axios.post(webhook, data)
        }

        io.emit(hodlInvoice.id, data)
      } catch (error) {
        log.error({ error }, 'Error paying invoice')
        await cancelHodlInvoice({ lnd, id: hodlInvoice.id })
        if (webhook) {
          axios.post(webhook, {
            id: hodlInvoice.id,
            settled: false,
            preimage: null,
            metadata,
          })
        }
      }

      sub.removeAllListeners()
    }
  })

  return { request: hodlRequest, estimatedRoutingFee, serviceFee, originalAmount, finalAmount }
}

export async function isInvoicePaid(id: string) {
  const invoice = await getInvoice({ lnd, id })

  return {
    settled: invoice.is_confirmed,
    preimage: invoice.is_confirmed ? invoice.secret : null,
  }
}

export async function estimateRoutingFee({ tokens, destination }: { tokens: number; destination: string }) {
  const { route } = await probeForRoute({ lnd, tokens, destination })

  if (!route) {
    throw new Error('No route found')
  }

  return {
    estimatedRoutingFee: route.safe_fee,
  }
}
