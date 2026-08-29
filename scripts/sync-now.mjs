import { handler } from '../lambda-function/index.js'

const result = await handler({})
console.log(result)
process.exit(0)