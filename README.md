# Freesia: a TypeScript library for building Node.js HTTP servers.

Freesia is a library for building Node.js HTTP servers, it provides a way to describe you HTTP handling process in a functional way.

## Installing

Install freesia into your project by a package manager, like NPM:

```sh
npm install freesia
```

This package contains built-in TypeScript declarations, you don't need any other packages to support it. But in practice, it's recommended to install `@types/node` as a developing dependency.

This package is also a dual-module package, you can use it in a CommonJS or a ESM project.

In CommonJS

```js
const { shimHTTP } = require("freesia");
```

In ESM and TypeScript

```js
import { shimHTTP } from "freesia";
```

## Hello World

```js
// app.js
import { shimHTTP, response } from "freesia";
import { createServer } from "http";

const main = async (req) => response("hello, world");
createServer(shimHTTP(main)).listen(8080);
```

Run it with `node app.js`, and then visit <http://localhost:8080>, you'll see the `"hello, world"` message.

In this example, we find that `shimHTTP` function transform a function into a http request handler, the function we give is the `EntryPoint` of a Freesia app. `EntryPoint` is the type of function which parameter is the request body from `http`/`https`/`http2` module, and return a `Respond<string|Uint8Array|Readable>` tuple.

## Concepts

### Bootstrap process

Http servers are always designed in event-driven architecture, which means the code we write is in fact a "bootstrap code": it will be executed directly, create port listener, prepare resources(for example, connect to a database), define handler functions and bind them to events.

In a bootstrap process, the handler function won't be called, they are used as values which tell the server what to do when requests come in.

### Request handling process

After the bootstrap process finished, the server will keep running and waiting requests come in. If a request comes in, it will call the handler function to deal with this request. [Freesia hooks](#hooks) and router functions created by [Routing](#routing) functions can be called only in request handling process.

## Respond

`Respond<T>` is a tuple that can define a response, it includes 3 parts: a body of type `T`, status and http headers.

### Respond body

The first element of the tuple is the body of the response, it can be any type specified by template type `T`, or `undefined` if you'd like to response nothing.

### Respond status

The second element of the tuple is the status of the response, it can be a http status code, for example `200`, or a status code with custom status text like `[200, "Success"]`.

### Respond http headers

Elements after the second element are http headers, headers can be defined as `Record<string, string | string[]>`. For example, such two patterns have the same result:

```ts
const res1: Respond<string> = [
    "hello, world",
    200,
    { "Content-Type": "text/plain", "Content-Length": "12" },
];
const res2: Respond<string> = [
    "hello, world",
    200,
    { "Content-Type": "text/plain" },
    { "Content-Length": "12" },
];
```

Element with higher index will have higher priority when header names duplicated. For example:

```ts
[
    "hello, world",
    200,
    { "Content-Type": "text/html", "Content-Length": "12" },
    { "Content-Type": "text/plain" },
];
```

This Respond will be response with header `Content-Type: text/plain`.

### response function

It's not difficult to create a `Respond<T>` manually, but function `response` provide an another way.

Follow examples can create a `Respond<T>`:

```ts
response("hello, world"); // [ 'hello, world', 200 ]
response(undefined); // [ undefined, 204 ]
response("hello, world", 200, { "Content-Type": "text/plain" }); // [ 'hello, world', 200, { 'Content-Type': 'text/plain' } ]
```

`response` method can attach http headers to an existed `Respond`:

```ts
const res = response("hello, world"); // [ 'hello, world', 200 ]
response(res, { "Content-Type": "text/plain", "Content-Length": "12" });
// [
//   'hello, world',
//   200,
//   { 'Content-Type': 'text/plain', 'Content-Length': '12' }
// ]
```

It also provide a way to rebuild another Respond from existed Respond:

```ts
const res = response<{ message: string }>({ message: `hello, world` }, 200);
response(res, (body, status, headers) => {
    return response(JSON.stringify(body), status, ...headers, {
        "Content-Type": "application/json",
    });
});
// [
//   '{"message":"hello, world"}',
//   200,
//   { 'Content-Type': 'application/json' }
// ]
```

It's useful in `EntryPoint` function because the body type must be binary-like (`string | Uint8Array | Readable`).

Rebuild with asynchronous rebuilders will give a Promised Respond.

```ts
const res = response("./README.md", 200);
const resAsync = response(res, async (body, status, headers) => {
    return response(
        await fs.promises.readFile(url, { encoding: "utf-8" }),
        status,
        ...headers,
        { "Content-Type": getType(url) }
    );
}); // Promise<[string, 200, { "Content-Type": "text/markdown" }]>
```

## Routing

Request pathname is one of the most important thing in a request url that tell the server what the client need. The server side application need to binding a handler function to each path pattern. The most simple example of a routing looks like this:

```ts
function main() {
    const { pathname } = useURL();
    let response: Respond<string | Uint8Array | Readable>;
    if (pathname.match(/^(\/api)/)) {
        response = apiHandler();
    } else if (pathname.match(/^(\/(login|logout))/)) {
        response = userSessionHandler();
    } else if (pathname.match(/^(\/favicon.ico)$/)) {
        response = faviconHandler();
    } else if (pathname.match(/^(\/public)/)) {
        response = staticFileHandler();
    } else {
        response = renderHandler();
    }
    return response;
}
```

In this example, we use `if else` block to get right value of response by calling corresponding handler, with freesia routing functions, we can do this more elegant.

### Define routes separately

`createRoute(pattern, handler, flags)` can define a route. For example:

> `flags` is the RegExp flags, default value is `"i"`

```ts
const helloRt = createRoute(
    "/hello/:<lang>/:<username>",
    ({ lang, username }) =>
        response(`${i18n("hello", lang)}, ${username}`, 200, {
            "Content-Type": "text/plain",
        })
);
const res = helloRt(useURL().pathname) ?? response("No route matched", 404);
```

In pattern, there are 4 ways to describe a route parameter:

-   `:<paramName>`: match a string between two `/`, for example, `/hello/:<username>` can match `/hello/freesia` and `/hello/freesia/` but can't match `/hello/freesia/13`
-   `:{paramName}`: match a string greedily, for example, `/hello/:{username}/` can match `/hello/freesia/` and `/hello/js/freesia/` (`username` is `"js/freesia"`).
-   `:[paramName]`: like `:{paramName}`, but can catch 0 characters string, for example `/hello/:[username]` can match `/hello/`, while `username` is `""`.
-   `:(paramName)`: like `:[paramName]`, can match `/` before the parameter, for example `/hello/:(username)` can match `/hello`, while `username` is `undefined`.

`createRoute` will return a route function that receive a string as parameter, if this string matched the pattern, the matched parameters will passed to the handler, and return a value, if no matched, the route function won't call the handler but return `null` directly. You can hub many route functions together with `??` operator as they will return null if not matched, just like this:

```ts
const res =
    helloRt(pathname) ??
    goodbyeRt(pathname) ??
    updateInfoRt(pathname) ??
    disableUserRt(pathname) ??
    response("No route matched", 404);
```

With `createSwitcher`, you can hub many route functins together:

```ts
const switcher = createSwitcher(
    helloRt,
    goodbyeRt,
    updateInfoRt,
    disableUserRt
);
const res = switcher(pathname) ?? response("No route matched", 404);
```

This requires all routes functions has the same return type, or specify a template type for `createSwitcher<T>` that capitable with all route functions.

### Define routes at one place

`createSwRt` function provides a way to create routes and hub them to a switcher at the same time, like this:

```ts
const switcher = createSwRt<Respond<BinaryLike>>()
    .route("/hello/:<username>", helloHandler)
    .route("/goodbye/:<username>", goodbyeHandler)
    .route("/update_info/:<username>/:<operate>/:[restArgs]", updateInfoHandler)
    .route("/user/:<usrename>/disable", disableUserHandler)
    .build();
const res = switcher(pathname) ?? response("No route matched", 404);
```

The `build` method will return a switcher function, which returns `null` (if no routes matched) or the handler return value.

`fallback` method can also return a switcher function, it won't return null:

```ts
const switcher = createSwRt<Respond<BinaryLike>>()
    .route("/hello/:<username>", helloHandler)
    .route("/goodbye/:<username>", goodbyeHandler)
    .route("/update_info/:<username>/:<operate>/:[restArgs]", updateInfoHandler)
    .route("/user/:<usrename>/disable", disableUserHandler)
    .fallback((url) => response(`No route matched url ${url}`, 404));
const res = switcher(pathname);
```

### Methods limit

Use an object instead of a function to dispatch requests to different handlers by request methods. For example,

```ts
const getUserInfoRt = createRoute("/user/:<username>/info", {
    GET: getUserInfoHandler,
    PUT: updateUserInfoHandler,
});
```

```ts
const getUserInfoRt = createRoute("/user/:<username>/info", {
    GET: userInfoHandler,
});
```

It also works in `createSwRt`:

```ts
const switcher = createSwRt<Respond<BinaryLike>>()
    .route("/hello/:<username>", { GET: helloHandler })
    .route("/goodbye/:<username>", { GET: goodbyeHandler })
    .route("/update_info/:<username>/:<operate>/:[restArgs]", {
        PUT: updateInfoHandler,
    })
    .route("/user/:<usrename>/disable", { Put: disableUserHandler })
    .fallback((url) => response(`No route matched url ${url}`, 404));
const res = switcher(pathname);
```

## Hooks

Some values might be used in many functions called during a request handling process, as a result it must be passed through many hierarchies. With Node.js AsyncStorage API, freesia provides some hooks to get values with out pass them in parameters.

### useRequest

`useRequest` hook provide a way to access the request object any where in a request handling process.

### useURL

`useURL` provide a way to access request url. See the overloads [here](https://qihexiang.github.io/freesia/modules.html#useURL)

### createContext

`createContext` provide a way to create a context for a request handling process. See the definitions here:

And examples:

```ts
const [assignUser, getUser, dropUserCtx] = createContext<Promise<User>>();

// UserValidate will access DB and assign a user model to context
function UserValidate(username: string, token: string): boolean {
    if (validate(username, token)) {
        assignUser(DB.query({ where: { username } }));
        return true;
    }
    return false;
}
// This is a function only be called in a request handling process
async function getUserName(): Promise<string | undefined> {
    return (await getUser())?.username;
}
```

## Utils

### composeFn

`composeFn` provides a way to compose many functions together:

```ts
const { fn } = composeFn((x: number) => x + 1)
    .next((x) => Math.pow(x, 2))
    .next((x) => x / 2)
    .next((x) => `result is ${x}`);
fn(4); // result is 12.5
```

### computeStream

`computeStream` provide a way to compute a value in a stream style process.

```ts
const value = computeStream(4)
    .map((x) => x + 1)
    .map((x) => Math.pow(x, 2))
    .map((x) => x / 2)
    .map((x) => `the result is ${x}`).value;
```

Except `map` method, there is `mapNN` method, which you can only deal with non-null values and let `null` and `undefined` passed through.

```ts
const value = computeStream(token)
    .map((tk) => validator(tk)) // validator will return null if not valid
    .mapNN((username) => queryUser(username)).value; // queryUser will return null if no such user // Promise<User> | null
```

`computeStreamLazy` has the same API with `computeStream`, but functions are called each time accessing value property.

### createEffect

`createEffect` can create a wrapper for a function that do some side-effect for the original function. An example looks like this:

```ts
const add = (a: number, b: number) => a + b;
const debugWrapper = createEffect<typeof add>((a, b) => {
    console.log(`a is ${a}, b is ${b}`);
    return (result) => {
        console.log(`result is ${result}`);
    };
});
const wrappedAdd = debugWrapper(add);
const result = wrappedAdd(1, 2);
/**
 * logs:
 * a is 1, b is 2
 * result is 3
 */
```

`createEffect4Any` is very similar to `createEffect`, the wrapper created by it can wrap any type of function, but the side effect should be irrelevant with the parameters and return value of the original function. For example:

```ts
const fib = (index: number): number => {
    if (index === 0 || index === 1) return 1;
    else return fib(index - 1) + fib(index - 2);
};
const timeMeasure = createEffect4Any(() => {
    const start = new Date().getTime();
    return () => {
        console.log(`Use ${new Date().getTime() - start}ms`);
    };
});
const fibWithTM = timeMeasure(fib);
fibWithTM(40);
/**
 * logs:
 * Use 1452ms
 */
```

### createProxy

createProxy provide a way to proxy a function, which can rewrite the parameters and return values.

For example:

```ts
declare function queryUser(userId: string): Promise<User>;
const getUserEmailWrapper = createProxy<
    typeof queryUser,
    (username: string, token: string) => Promise<string | undefined>
>(async (username: string, token: string) => {
    const userId = await validator(username, token);
    // first element null told the proxy not to call the original function
    // second element will be executed to get a fallback value.
    if (userId === undefined) return [null, () => undefined];
    // first element pass parameters in an array
    // second element will be called to deal with the original return value.
    else
        return [
            [userId],
            async (user) => {
                return (await user).email;
            },
        ];
});
const getUserEmail = getUserEmailWrapper(queryUser);
const email = getUserEmail(username, token);
```

Look at docs of [createProxy](https://qihexiang.github.io/freesia/modules.html#createProxy)

### memoryCache

memoryCache is a wrapper that can cache return value of a function.

Example:

```ts
const fib = memoryCache((index: number): number => {
    if (index === 1 || index === 2) return 1;
    else return fib(index - 1) + fib(index - 2);
});
```

This wrapper will receive origin parameters as an array, and compare with used parameters by `===` operator and `Object.is` function (same-zero-value comparation).

> Be careful when using objects as parameters, `{a: 1} !== {a: 1}`, `[1,2,3] !== [1,2,3]`.

### isVoid

`isVoid` can return if a value is `null` or `undefined`.

```ts
declare let value: string | undefined | null;
if (isVoid(value)) {
    value; // => undefined | null
}
if (isVoid(value, [undefined])) {
    value; // => undefined
}
if (isVoid(value, [null])) {
    value; // => null
}
declare let mayNotDefined: string | undefined;
if (isVoid(mayNotDefined)) {
    mayNotDefined; // => undefined
}
declare let nullableValue: string | null;
if (isVoid(nullableValue)) {
    nullableValue; // => null
}
```

### isEnum

`isEnum` provides a way to check if a value one of the enum values, for example, a user-input string:

```ts
// valid option can be "auto", "manual", "default"
const option: string = await getUserInput();
if (isEnum(option, ["auto", "manual", "default"])) {
    option; // => "auto" | "manual" | "default"
}
```

Support string and number as basic types.

### Others

-   resJson
-   rateLimiter

Find their docs in the [GitHub Pages](https://qihexiang.github.io/freesia/)
