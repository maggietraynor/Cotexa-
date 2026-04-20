import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import pedidosRoutes from './routes/pedidos'
import clientesRoutes from './routes/clientes'
import dashboardRoutes from './routes/dashboard'
import camposRoutes from './routes/campos'
import notificacionesRoutes from './routes/notificaciones'
import webhookRoutes from './routes/webhook'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

app.use('/api', webhookRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/pedidos', pedidosRoutes)
app.use('/api/clientes', clientesRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/campos', camposRoutes)
app.use('/api/notificaciones', notificacionesRoutes)

app.listen(PORT, () => {
  console.log(`✅ Cotexa backend corriendo en http://localhost:${PORT}`)
})

export default app
