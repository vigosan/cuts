const path = require('node:path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
const ownReact = path.join(__dirname, 'node_modules')

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    return context.resolveRequest({ ...context, originModulePath: path.join(ownReact, 'index.js') }, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
