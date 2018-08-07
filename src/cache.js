export default class Cache {
  constructor (options = {}) {
    this._c = {}
  }

  add (k, v) {
    this._c[k] = v
  }

  get (k) {
    return this._c[k]
  }

  /**
   * Return a path from cache
   * @param {string} id
   * @return {string|nulld}
   */
  resolve (id, origin) {
    const key = this.getCacheKey(id, origin)

    if (key in this._c) {
      return this._c[key]
    }

    return false
  }

  getCacheKey (id, origin) {
    const isRelativePath = id.indexOf('.') === 0
    return isRelativePath ? `${origin}:${id}` : id
  }
}
