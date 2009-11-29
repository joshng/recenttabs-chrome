
/*
 * Copyright(c) 2006 GoalKeeper Software, Inc.
 */

// NOTE: depends heavily on prototype.js

function ABSTRACT(name) {
  return function() { throw("ABSTRACT METHOD MUST BE OVERRIDDEN: " + name); };
};

if (/Internet Explorer/.test(navigator.appName)) {
  Array.indirectSuperclass = Array;
}

Object.extend(String.prototype, {
  downcaseFirstChar: function() { return this.charAt(0).toLowerCase() + this.substring(1); },
  upcaseFirstChar: function() { return this.charAt(0).toUpperCase() + this.substring(1); },
  camelCasePrefix: function(prefix) { return prefix + this.upcaseFirstChar(); }
});

Event.getCharCode = function(ev) {
  return ev.charCode || ev.keyCode;
};

(function() {
  var INITIALIZER_METHOD = 'initialize';
  var CLASS_METHODS = '_classMethods';
  var STATIC_INITIALIZER = '_classInitialize';
  var ON_INCLUDED = '_onIncluded';
  var ON_SUBCLASSED = '_onSubclassed';
  var DESTRUCTOR_METHOD = '_destructor';
  var OVERRIDES = '_overrides';
  var ABSTRACT_DECL = '_ABSTRACT';

  Object.extend(Function.prototype, {
    newSubclass: function(name, mixins) {
      var memberList = $A(arguments).flatten();
      if (typeof(name) == "string") {
	memberList.shift();
      } else {
	name = this.name;
      }

      var klass = structor(name, this);

      if (this[ON_SUBCLASSED]) {
        this[ON_SUBCLASSED](klass);
      }

      klass.mixin(memberList);

      return klass;
    },

    mixin: function(members) {
      var prototype = this.extendedPrototype;
      if (!prototype) {
        prototype = this.extendedPrototype = this.prototype;
      }

      var klass = this;
      $A(arguments).flatten().each(function(members) {
        var staticInit;
        for (var property in members) {
          var value = members[property];
          // TODO: should this be a switch?
          switch (property) {
            case INITIALIZER_METHOD:
              klass.initializers.push(value); break;
            case DESTRUCTOR_METHOD:
              klass.destructors.push(value); break;
            case OVERRIDES:
              klass.override(value); break;
            case ABSTRACT_DECL:
              klass.declareAbstract(value); break;
            case CLASS_METHODS:
              klass.extendClass(value); break;
            case STATIC_INITIALIZER:
            case ON_INCLUDED:
              staticInit = value;
              break;
            default:
              prototype[property] = value;
          }
        }

        if (staticInit) {
          staticInit.call(klass);
        }
      });
    },

    extendClass: function(classMethods) {
      Object.extend(this, classMethods);
      Object.extend(this.classMethods, classMethods);
    },

    newSingleton: function(mixins) {
      var subclass = this.newSubclass.apply(this, arguments);
      return new subclass();
    },

    declareAbstract: function(members) {
      for (var name in members) {
        this.prototype[name] = ABSTRACT(name);
      }
    },
    
    override: function(members) {
      for (var name in members) {
        this.prototype[name] = createOverride.call(this, name, members[name]);
      }
    },

    wrap: function(wrapper) {
      var orig = this;
      return function() {
        var prevUnwrappedInstance = orig.unwrappedInstance;
        var prevUnwrappedArgs = orig.unwrappedArguments;
        orig.unwrappedInstance = this;
        orig.unwrappedArguments = arguments;
        var args = [orig].concat($A(arguments));
        try {
          return wrapper.apply(this, args);
        } finally {
          orig.unwrappedInstance = prevUnwrappedInstance;
          orig.unwrappedArguments = prevUnwrappedArgs;
        }
      };
    },

    proceed: function() {
      return this.apply(this.unwrappedInstance, this.unwrappedArguments);
    }
  });

  function structor(name, superclass) {
    var indirectSuperclass = superclass.indirectSuperclass;
    var getInstance = indirectSuperclass ? getIndirectSubclassInstance : Prototype.K;
    eval("var klass = function " + name + "() {" +
"\n      var initializerStack = klass.initializers.clone();" +
"\n      var args = arguments;" +

"\n      var instance = getInstance(this, klass);" +

      // we temporarily add a function to this instance that calls the next chained initializer;
      // we'll remove it after we're done 'structing.
"\n      instance._super = function() {" +
"\n        if (!initializerStack.length) {" +
"\n          alert('ERROR: Attempted to call _super in a class with no super-constructor');" +
"\n          return; " + // todo: throw here?
"\n        }" +
"\n        if (arguments.length) {" +
"\n          args = arguments;" +
"\n        }" +
"\n        initializerStack.pop().apply(instance, args);" +
"\n      };" +

      // if you don't call _super in your constructor, we'll call it for you with the most recent args"
"\n      while (initializerStack.length) {" +
"\n        instance._super.apply(instance, args);" +
"\n      }" +

"\n      delete instance._super;" +
"\n      if (indirectSuperclass) return instance;" +
"\n    }");

    var prototype;
    if (!indirectSuperclass) {
      function inheritance() {
      }
      inheritance.prototype = superclass.prototype;
      prototype = klass.prototype = klass.extendedPrototype = new inheritance();
    } else {
      // We can't subclass some classes directly (particularly, Array in
      // Internet Explorer, because this breaks the 'length' and 'push' methods).
      // In this case, instead of manipulating the prototype of the constructor
      // function, we just build our own 'extendedPrototype' and apply it manually
      // in the structor().
      prototype = {};

      if (superclass.extendedPrototype) {
        Object.extend(prototype, superclass.extendedPrototype);
      }
      klass.extendedPrototype = prototype;
      klass.indirectSuperclass = indirectSuperclass;
    }

    prototype.constructor = klass;
    klass.superclass = superclass;
    klass.factory = createFactory(klass);
    klass.initializers = (superclass.initializers ? superclass.initializers.clone() : [superclass.prototype.constructor]);
    klass.destructors = (superclass.destructors ? superclass.destructors.clone() : []);
    klass.classMethods = {};
    if (superclass.classMethods) klass.extendClass(superclass.classMethods);

    prototype.destroy = destructor;

    return klass;
  }

  function getIndirectSubclassInstance(self, klass) {
    var instance = new klass.indirectSuperclass();
    Object.extend(instance, klass.extendedPrototype);
    return instance;
  }

  function createOverride(name, method) {
    var orig = this.prototype[name];
    var wrapper = method.wrap(function() {
      var oldSuper = method._super;
      var instance = this;
      method._super = function() {
        // if no arguments were passed to _super, default to the arguments passed to the override
        return orig.apply(instance, arguments.length ? arguments : method.unwrappedArguments);
      }

      try {
        return method.proceed();
      } finally {
        method._super = oldSuper;
      }
    });

    wrapper.callSuper = function(scope, varargs) {
      orig.call.apply(orig, arguments);
    };
    wrapper.applySuper = function(scope, args) {
      orig.apply.apply(orig, arguments);
    }

    return wrapper;
  }

  function destructor() {
    this.constructor.destructors.invoke('apply', this);
  }

  function createFactory(klass) {
    return function factory() {
      if (arguments.length) {
        factoryConstructor.prototype = klass.prototype;
        var instance = new factoryConstructor();
        klass.apply(instance, arguments);
        return instance;
      } else {
        return new klass();
      }
    }
  }

  function factoryConstructor() {
  }
}());
