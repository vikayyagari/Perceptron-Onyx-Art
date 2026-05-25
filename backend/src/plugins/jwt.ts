import fp from 'fastify-plugin'
import jwtPlugin from '@fastify/jwt'
import { getJwtPrivateKey, getJwtPublicKey } from '../config'

export default fp(async (fastify) => {
  await fastify.register(jwtPlugin, {
    secret: {
      private: getJwtPrivateKey(),
      public: getJwtPublicKey(),
    },
    sign: {
      algorithm: 'RS256',
    },
    verify: {
      algorithms: ['RS256'],
    },
  })
})
