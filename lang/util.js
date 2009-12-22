Object.extendSafely = function(obj, members) {
  return Object.extend(obj || {}, members || {});
};
Object.extendUnlessDefined = function(obj, members) {
  Object.extendSafely(obj, $H(members).reject(function(pair) { !Object.isUndefined(obj[pair.key]) })._object);
};
Object.only = function(obj, members) {
  members = $A(arguments).flatten();
  obj = members.shift();
  return members.mapTo(function(member) {
    return obj[member];
  });
};
Object.except = function(obj, members) {
  members = $A(arguments).flatten();
  obj = members.shift();
  var result = Object.clone(obj);
  members.each(function(member) {
    delete result[member];
  });
  return result;
};

Object.reverseMerge = Object.extendUnlessDefined;


// the following Array/Enumerable code is ripped from prototype.js
var Prototype = {
  K: function(x) { return x; }
};

Object.localMethods = function(methods) {
  return $A(arguments).flatten().mapTo(function(method) {
    var fn = eval(method);
    if (!Object.isFunction(fn)) throw "Unrecognized local function: " + method; 
    return fn;
  });
};
