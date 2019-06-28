function options2arr(options) {
  const { query, variables, ...rest } = options;

  let arr = [query];
  if (variables) {
    const arVarKeys = Object.keys(variables);
    if (arVarKeys.length) {
      const arrVar = arVarKeys.map(key => variables[key]);
      arr = arr.concat(arrVar);
    }
    const arRestKeys = Object.keys(rest);
    if (arRestKeys.length) {
      const arrRest = arRestKeys.map(key => rest[key]);
      arr = arr.concat(arrRest);
    }
  }

  return arr;
}

export { options2arr };
