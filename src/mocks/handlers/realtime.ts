import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { updateSimulation } from '@/mocks/db'
import { bindRealtimeUser, trackRealtimeClient, realtimeIsPaused } from '@/mocks/realtime-hub'

const marketplace = ws.link('*')

export const realtimeHandlers = [
  marketplace.addEventListener('connection', (connection) => {
    if (realtimeIsPaused()) { connection.client.close(1013, 'Simulated network interruption'); return }
    const io = toSocketIo(connection)
    const id = crypto.randomUUID()
    const untrack = trackRealtimeClient({
      id,
      userId: null,
      close: () => connection.client.close(1012, 'Simulated network interruption'),
      emit: (name, payload) => {
        io.client.emit(name, payload)
      },
    })

    connection.client.addEventListener('message', (event) => {
      if (event.data === '2') {
        connection.client.send('3')
      }
    })

    connection.client.addEventListener('close', () => {
      untrack()
    })

    io.client.on('session.bind', (_event, payload: { token?: string | null }) => {
      const token = payload && typeof payload.token === 'string' ? payload.token : null
      if (!token) {
        bindRealtimeUser(id, null)
        return
      }

      void updateSimulation((state) => {
        const session = state.sessions.find((item) => item.token === token && Date.parse(item.expiresAt) > Date.now())
        bindRealtimeUser(id, session?.userId ?? null)
        return state
      })
    })
  }),
]
