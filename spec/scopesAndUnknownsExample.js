// Locals: [globalVar, foo]
var globalVar = 5;

function foo() {
	// Locals: [bar, firstLevel, firstLevelSecondLevel, arr]
	// Unkown: []
	function bar(baz) {
		// Locals: [thirdLevel]
		// Unkown: [baz]
		var thirdLevel = "third";
		firstLevelSecondLevel = "asdf";
		console.log(baz + " " + thirdLevel);
	}

	var firstLevel = "Hello";
	var firstLevelSecondLevel = "world";
	bar(firstLevel);

	// function names of pseudo-lambdas are available locally in the function
	var arr = "asdf".split("").map(function uppercase(s) {
		// Locals: [uppercase]
		// Unknown: [s]
		return s.toUpperCase();
	});

	console.log(arr);
}

foo();

// anotherAnonymous and anotherAnonymous should not be accessible globaly
// only inside their own scopes
(function anAnonymous(anonymous) {
	// Locals: [anAnonymous, secret]
	// Unknown: [anonymous]
	var secret = "stuff";
	anonymous(secret);
})(function anotherAnonymous(text) {
	// Locals: [anotherAnonymous, anonymousInner]
	// Unknown: [text]
	var anonymousInner = "inner";
	console.log(text);
	globalVar = 3; // TODO: return globalVar
});