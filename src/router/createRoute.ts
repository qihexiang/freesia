import { useURL } from "../core";
import { RouteParam } from "./params";

export type RouteHandler<P extends string, R> =
    | {
          [method: string]: (params: RouteParam<P>) => R | undefined;
      }
    | ((params: RouteParam<P>) => R | undefined);
export type Route<R> = (url: string) => R | undefined;
export type RouteHandlerX<P extends string, X, R> =
    | {
          [method: string]: (params: RouteParam<P>, extra: X) => R | undefined;
      }
    | ((params: RouteParam<P>, extra: X) => R | undefined);
export type RouteX<R, X> = (url: string, extra: X) => R | undefined;

/**
 * Create a route that request can get in.
 *
 * @param pattern specify the url matching pattern,
 * like `/user/:<username>/:<age>/:{extra}/` can match url
 * `/user/miku/10/other/many/arguments/?timestamp=1641891955803`.
 *
 * @param handlers is a function that can receive route matched
 * params and searchParams generated by URL class and return some
 * thing.
 *
 * @returns a function that receive a string as argument, if the
 * string matched the pattern, call the handler and return its
 * result, otherwise return undefined.
 */
export function createRoute<P extends string, R>(
    pattern: P,
    handlers: RouteHandler<P, R>,
    flags?: string
): Route<R> {
    const re = createRegExp(pattern, flags);
    return (url: string) => {
        const matched = re.exec(url);
        if (matched && typeof handlers === "function") {
            return handlers(matched.groups as RouteParam<P>);
        }
        const method = useURL("method");
        if (matched && typeof handlers === "object" && method in handlers) {
            return handlers[method](matched.groups as RouteParam<P>);
        }
        return undefined;
    };
}

/**
 * Create a route that request can get in.
 *
 * @param pattern specify the url matching pattern,
 * like `/user/:<username>/:<age>/:{extra}/` can match url
 * `/user/miku/10/other/many/arguments/?timestamp=1641891955803`.
 *
 * @param handlers is a function that can receive route matched
 * params and searchParams generated by URL class and return some
 * thing.
 *
 * @returns a function that receive a string argument and
 * a extra arugment, if the string matched the pattern,
 * call the handler and return its result, otherwise return
 * undefined.
 */
export function createRouteX<P extends string, X, R>(
    pattern: P,
    handlers: RouteHandlerX<P, X, R>,
    flags?: string
): RouteX<R, X> {
    const re = createRegExp(pattern, flags);
    return (url: string, extra: X) => {
        const matched = re.exec(url);
        const method = useURL("method");
        if (matched && typeof handlers === "function") {
            return handlers(matched.groups as RouteParam<P>, extra);
        }
        if (matched && typeof handlers === "object" && method in handlers) {
            return handlers[method](matched.groups as RouteParam<P>, extra);
        }
        return undefined;
    };
}

export function createRegExp<P extends string>(pattern: P, flags = "i") {
    const parsedPattern = pattern
        .replaceAll(/:<.+?>/g, (matched) => `(?${matched.slice(1)}[^/]+?)`)
        .replaceAll(
            /:\{.+?\}/g,
            (matched) =>
                `(?${matched.slice(1).replace("{", "<").replace("}", ">")}.+)`
        )
        .replaceAll(
            /\/:\(?.+?\)/g,
            (matched) =>
                `((/(?${matched
                    .slice(2)
                    .replace("(", "<")
                    .replace(")", ">")}.*))?)`
        )
        .replaceAll(
            /:\[.+?\]/g,
            (matched) =>
                `(?${matched.slice(1).replace("[", "<").replace("]", ">")}.*)`
        );
    const endsWithSlash = parsedPattern.endsWith("/");
    return new RegExp(
        `^${parsedPattern}${endsWithSlash ? "" : "(/?)"}$`,
        flags
    );
}
