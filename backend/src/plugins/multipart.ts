import fp from 'fastify-plugin'
import multipartPlugin from '@fastify/multipart'

export default fp(async (fastify) => {
  await fastify.register(multipartPlugin, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50 MB
      files: 1,
    },
  })
})
