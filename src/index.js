import path from 'path'
import fs from 'fs'
import Cache from './cache'

const localImport = /^[.]{1,2}\//

const fileExists = file => {
  try {
    if (fs.existsSync(file)) {
      let stat = fs.statSync(file)
      return stat.isFile()
    }
  } catch (e) {}
  return false
}

const getExistingFileWithExt = (file, extensions) => {
  for (let i = 0; i < extensions.length; i++) {
    let f = file + extensions[i]
    if (fileExists(f)) return f
  }
  return null
}

const resolvePath = (file, options) => {
  if (fs.existsSync(file)) {
    if (!fs.statSync(file).isDirectory()) {
      // Consider it a file
      return file
    } else {
      const entry = resolveModuleEntry(file, options)
      if (entry) {
        return entry
      }
    }

    // There is a dir, also check if there isn't a file with extension
    // on the same level with dir
    let f = getExistingFileWithExt(file, options.extensions)
    if (f !== null) {
      return f
    }

    // Consider the file to be index.*
    file = path.resolve(file, '.', options.indexFile)
  }

  // Try to get using extensions
  return getExistingFileWithExt(file, options.extensions)
}

const resolveModuleEntry = (dir, options) => {
  let pkgfile = path.join(dir, 'package.json'), pkg
  if (fileExists(pkgfile) && (pkg = require(pkgfile))) {
    const mainFields = options.mainFields.reduce((p, mainField) => {
      const t = pkg[mainField]
      if (t && p.indexOf(t) === -1) p.push(t)
      return p
    }, [])

    const main = mainFields.reduce((p, mainField) => {
      if (!p) {
        const f = path.join(dir, mainField)
        if (fileExists(f)) return f
      }
      return p
    }, '') || path.join(dir, 'index.js')
    return main
  }
}

const isAlias = (file, alias) => {
  if (alias === file) {
    return true
  }
  if (!file.startsWith(alias)) {
    return false
  }
  return file[alias.length] === '/'
}
const getAlias = function getAlias (file, aliases, start) {
  for (let i = start, l = aliases.length, o; i < l; ++i) {
    if ((o = aliases[i]) && isAlias(file, o[0])) return [ i, o ]
  }
  return null
}
const resolveAliases = (target, aliases, start = 0) => {
  if (localImport.test(target)) return null
  const tuple = getAlias(target, aliases, start)
  if (tuple === null) return null
  let [ cursor, [ alias, p ] ] = tuple
  p = path.join(p, target.substr(alias.length))
  return resolveAliases(p, aliases, ++cursor) || p
}

const resolveModuleAsset = (t, options) => {
  if (path.isAbsolute(t)) {
    return resolvePath(t, options)
  }
  let moduleDir, parts = t.split('/'), moduleName = parts[0], res
  if (t.charAt(0) === '@') {
    moduleName = parts.slice(0, 2).join('/')
    res = parts.slice(2).join('/')
  } else {
    moduleName = parts.shift()
    res = parts.join('/')
  }
  let pkgfile = require.resolve(path.join(moduleName, 'package.json'))
  moduleDir = pkgfile.slice(0, -12)
  return resolvePath(path.resolve(moduleDir, res), options)
}

export default (options) => {
  if (!options) {
    options = { extensions: ['.js'], alias: {} }
  } else {
    if (Array.isArray(options)) {
      options = { extensions: options }
    }
    if (!options.extensions) {
      options.extensions = ['.js']
    }
    if (!options.alias) {
      options.alias = {}
    }
  }

  if (options.extensions.length === 0 && Object.keys(options.alias).length === 0) {
    return {}
  }

  options = Object.assign({}, options)

  // { k/v, ... } => [ [k, v], ... ]
  const aliases = options.alias
  options.alias = Object.keys(aliases).reduce((p, k) => (p.push([ k, aliases[k] ]), p), []) // eslint-disable-line

  if (!options.indexFile) {
    options.indexFile = 'index'
  }

  options.mainFields = options.mainFields || [ 'module', 'jsnext:main', 'main', 'browser' ]

  const cache = new Cache()

  return {
    resolveId (importee, importer) {
      if (!importer) {
        return null
      }

      let cv
      const cacheKey = cache.getCacheKey(importee, importer)
      if (cv = cache.get(cacheKey)) {
        return cv
      }

      var file = null
      if (!localImport.test(importee)) {
        // Check for alias
        var p = resolveAliases(importee, options.alias)
        if (p) {
          file = resolveModuleAsset(p, options)
        } else {
          return null
        }
      } else {
        // Local import is relative to importer
        file = path.resolve(importer, '..', importee)
      }

      const newPath = resolvePath(file, options)
      if (newPath) {
        cache.add(cacheKey, newPath)
        return newPath
      }

      // if no path was found, null must be returned to keep the
      // plugin chain!
      return null
    }
  }
}
