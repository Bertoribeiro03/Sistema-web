import { createServer } from 'node:http'
import handler from '../api/clinic.js'

const server = createServer(handler)
server.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }))
