import { useURL } from "../core";
import { RouteParams } from "./pathToRegExp";
import {
    match,
    ParseOptions,
    RegexpToFunctionOptions,
    TokensToRegexpOptions,
} from "path-to-regexp";

export type RouteHandler<P extends string, R> =
    | {
          [method: string]: (params: RouteParams<P>) => R | undefined;
      }
    | ((params: RouteParams<P>) => R | undefined);
export type Route<R> = (url: string) => R | undefined;
export type RouteHandlerX<P extends string, X, R> =
    | {
          [method: string]: (params: RouteParams<P>, extra: X) => R | undefined;
      }
    | ((params: RouteParams<P>, extra: X) => R | undefined);
export type RouteX<R, X> = (url: string, extra: X) => R | undefined;

/**
 * Create a route that request can get in.
 *
 * @param pattern specify the url matching pattern.
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
    options?: ParseOptions & TokensToRegexpOptions & RegexpToFunctionOptions
): Route<R> {
    const re = match(pattern, options);
    return (pathname: string) => {
        const matched = re(pathname);
        if (matched && typeof handlers === "function") {
            return handlers(matched.params as RouteParams<P>);
        }
        const method = useURL("method");
        if (matched && typeof handlers === "object" && method in handlers) {
            return handlers[method](matched.params as RouteParams<P>);
        }
        return undefined;
    };
}

/**
 * Create a route that request can get in.
 *
 * @param pattern specify the url matching pattern.
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
    options?: ParseOptions & TokensToRegexpOptions & RegexpToFunctionOptions
): RouteX<R, X> {
    const re = match(pattern, options);
    return (pathname: string, extra: X) => {
        const matched = re(pathname);
        const method = useURL("method");
        if (matched && typeof handlers === "function") {
            return handlers(matched.params as RouteParams<P>, extra);
        }
        if (matched && typeof handlers === "object" && method in handlers) {
            return handlers[method](matched.params as RouteParams<P>, extra);
        }
        return undefined;
    };
}
