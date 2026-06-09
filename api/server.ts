import app, { startApp } from './app.js'

const PORT = process.env.PORT || 3001

async function main() {
  const server = app.listen(PORT, async () => {
    try {
      await startApp()
      console.log(`Server ready on port ${PORT}`)
    } catch (err) {
      console.error('Failed to initialize:', err)
      process.exit(1)
    }
  })

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received')
    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })
  })

  process.on('SIGINT', () => {
    console.log('SIGINT signal received')
    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })
  })
}

main()

export default app
