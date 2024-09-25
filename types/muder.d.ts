declare module 'muder' {
  function muder<T>(source: any, mapper: any, addon?: Record<string, (value: any) => any>): T;
  export = muder;
}
