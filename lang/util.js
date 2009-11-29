Object.extendSafely = function(obj, members) {
  return Object.extend(obj || {}, members || {});
};

Object.extendUnlessDefined = function(obj, members) {
  Object.extendSafely(obj, $H(members).reject(function(pair) { !Object.isUndefined(obj[pair.key]) })._object);
};
Object.reverseMerge = Object.extendUnless;


// the following Array/Enumerable code is ripped from prototype.js
var Prototype = {
  K: function(x) { return x; }
};
