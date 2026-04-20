import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Token fijo para autenticar llamadas desde n8n
// Ponelo también como variable de entorno en Railway: WEBHOOK_SECRET=cotexa_whatsapp_2024
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'cotexa_whatsapp_2024'

router.post('/pedidos/webhook', async (req: Request, res: Response) => {
  // 1. Validar token de seguridad
  const token = req.headers['x-webhook-secret']
  if (token !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Token inválido' })
  }

  const {
    empresaSlug,      // ej: "cotexa" — identifica qué empresa recibe el pedido
    telefono,         // ej: "+5491112345678"
    nombreCliente,    // ej: "Juan Pérez" (opcional, WhatsApp a veces lo tiene)
    tipoCaja,         // ej: "troquelada" | "telescopica" | "rigida"
    largo,
    ancho,
    alto,
    cantidad,
    material,         // ej: "micro" | "doble_onda" | "cartulina"
    impresion,        // ej: "no" | "1_color" | "full_color"
    precioEstimado
  } = req.body

  // 2. Validar campos mínimos
  if (!empresaSlug || !telefono || !tipoCaja || !cantidad) {
    return res.status(400).json({ error: 'Faltan campos requeridos: empresaSlug, telefono, tipoCaja, cantidad' })
  }

  // 3. Buscar la empresa por slug
  const empresa = await prisma.empresa.findUnique({
    where: { slug: empresaSlug }
  })
  if (!empresa) {
    return res.status(404).json({ error: `Empresa no encontrada: ${empresaSlug}` })
  }

  // 4. Buscar o crear el cliente por teléfono
  let cliente = await prisma.cliente.findFirst({
    where: { empresaId: empresa.id, telefono }
  })

  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: {
        empresaId: empresa.id,
        nombre: nombreCliente || `WhatsApp ${telefono}`,
        telefono,
        tipo: 'B2C'
      }
    })
  }

  // 5. Crear el pedido en estado COTIZACION
  const count = await prisma.pedido.count({ where: { empresaId: empresa.id } })

  const pedido = await prisma.pedido.create({
    data: {
      empresaId: empresa.id,
      clienteId: cliente.id,
      numeroPedido: count + 1,
      estado: 'COTIZACION',
      largo: largo ? Number(largo) : null,
      ancho: ancho ? Number(ancho) : null,
      alto: alto ? Number(alto) : null,
      material: material || null,
      impresion: impresion || null,
      cantidad: cantidad ? Number(cantidad) : null,
      notasCliente: `Pedido recibido por WhatsApp desde ${telefono}`,
      precioBase: precioEstimado ? Number(precioEstimado) : null,
      precioTotal: precioEstimado ? Number(precioEstimado) : null,
      eventos: {
        create: {
          estado: 'COTIZACION',
          descripcion: 'Pedido creado automáticamente desde WhatsApp'
        }
      }
    },
    include: { cliente: true }
  })

  // 6. Crear notificación para el admin (aparece en el panel)
  await prisma.notificacion.create({
    data: {
      empresaId: empresa.id,
      mensaje: `🟢 Nuevo pedido por WhatsApp de ${cliente.nombre} (#${pedido.numeroPedido})`,
      pedidoId: pedido.id
    }
  })

  // 7. Responder a n8n con los datos del pedido creado
  res.json({
    ok: true,
    pedidoId: pedido.id,
    numeroPedido: pedido.numeroPedido,
    clienteNombre: cliente.nombre,
    precioEstimado: pedido.precioTotal
  })
})

export default router
