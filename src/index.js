const path = require('path')
const fs = require('fs')

const localImport = /^[.]{1,2}\//

const isAlias = (file, alias) => {
  if (alias === file) {
    return true
  }
  if (!file.startsWith(alias)) {
    return false
  }
  return file[alias.length] === '/'
}

const getAlias = (file, aliases) => {
  for (const p in aliases) {
    if (aliases.hasOwnProperty(p) && isAlias(file, p)) return p
  }
  return null
}

const getExistingFileWithExt = (file, extensions) => {
  for (let i = 0; i < extensions.length; i++) {
    let f = file + extensions[i]
    if (fs.existsSync(f)) {
      return f
    }
  }
  return null
}

const resolveModuleEntry = (dir, options) => {
  let pkgfile = path.join(dir, 'package.json'), pkg
  if (fs.existsSync(pkgfile) && (pkg = require(pkgfile))) {
    const mainFields = options.mainFields.reduce((p, mainField) => {
      const t = pkg[mainField]
      if (t && p.indexOf(t) === -1) p.push(t)
      return p
    }, [])

    const main = mainFields.reduce((p, mainField) => {
      if (!p) {
        const f = path.join(dir, mainField)
        if (fs.existsSync(f) && fs.statSync(f).isFile()) {
          return f
        }
      }
      return p
    }, '') || path.join(dir, 'index.js')
    return main
  }
}

module.exports = options => {
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

  if (!options.indexFile) {
    options.indexFile = 'index'
  }

  options.mainFields = options.mainFields || [ 'module', 'main', 'jsnext:main', 'browser' ]

  const resolvedCache = {}

  return {
    resolveId (importee, importer) {
      if (!importer) {
        return null
      }

      let file = null
      if (!localImport.test(importee)) {
        // Check for alias
        let alias = getAlias(importee, options.alias)
        if (alias === null) {
          return null
        }
        file = importee.substr(alias.length)
        if (file !== '') {
          file = '.' + file
        }
        file = path.resolve(options.alias[alias], file)
      } else {
        // Local import is relative to importer
        file = path.resolve(importer, '..', importee)
      }

      if (resolvedCache.hasOwnProperty(file)) {
        return resolvedCache[file]
      }

      const key = file
      const addCache = (v) => {
        if (v) resolvedCache[key] = v
        return v
      }

      if (fs.existsSync(file)) {
        if (!fs.statSync(file).isDirectory()) {
          // Consider it a file
          return addCache(file)
        } else {
          const entry = resolveModuleEntry(file, options)
          if (entry) {
            // console.log(`Resolve ${importee} => ${entry}`)
            return addCache(entry)
          }
        }
        // There is a dir, also check if there isn't a file with extension
        // on the same level with dir
        let f = getExistingFileWithExt(file, options.extensions)
        if (f !== null) {
          return addCache(f)
        }

        // Consider the file to be index.*
        file = path.resolve(file, '.', options.indexFile)
      }

      // Try to get using extensions
      return addCache(
        getExistingFileWithExt(file, options.extensions)
      )
    }
  }
}
