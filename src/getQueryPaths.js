
const getPath = (obj, arPath) => {
  let res = obj;
  for (let sub of arPath) {
    res = res[sub];
  }
  return res;
};
const setPath = (obj, _arPath, data) => {
  if (1 < _arPath.length) {
    let subPath = _arPath.slice(0, _arPath.length - 1);
    let lastSubPath = _arPath[_arPath.length - 1];
    let subObj = getPath(obj, subPath);
    subObj[lastSubPath] = data;
  } else if (_arPath.length === 1) {
    obj[_arPath[0]] = data;
  }
};

const getQueryPaths = query => {

  let definitions = query.definitions;
  let pathEdges = [];
  let pathPageInfo = [];
  let pathItem = [];

  let haveEdges = false;
  let havePageInfo = false;
  //let haveItem = false

  //console.log(query.definitions)

  for (let def of definitions) {
    if (def.operation === "query") {
      for (let sel of def.selectionSet.selections) {
        let directiveConnection = false;
        for (let dir of sel.directives) {
          if (dir.name.value === "connection") {
            directiveConnection = true;
            break;
          }
        }
        if (!directiveConnection) {
          throw new Error(
            'Query must contain directive @connection(key: "????")'
          );
        }

        if (directiveConnection) {
          pathEdges.push(sel.name.value);
          pathPageInfo.push(sel.name.value);

          for (let sel2 of sel.selectionSet.selections) {
            if (sel2.name.value === "edges") {
              pathEdges.push(sel2.name.value);
              haveEdges = true;
              for (let sel3 of sel2.selectionSet.selections) {
                if (sel3.name.value === "node") {
                  pathItem.push(sel3.name.value);
                  //haveItem = true
                  break;
                }
              }
            } else if (sel2.name.value === "pageInfo") {
              pathPageInfo.push(sel2.name.value);
              havePageInfo = true;
            }

            if (haveEdges && havePageInfo) {
              break;
            }
          }
        }

        if (haveEdges && havePageInfo) {
          break;
        }
      }
    }

    if (haveEdges && havePageInfo) {
      break;
    }
  }


  //const fnGetEdges = (data) => data.feedConnection.edges
  const fnGetEdges = data => getPath(data, pathEdges);
  //const fnSetEdges = (data, edges) => { data.feedConnection.edges = edges }
  const fnSetEdges = (data, edges) => {
    setPath(data, pathEdges, edges);
  };
  //  const fnGetItem = (edge) => edge.node
  const fnGetItem = edge => getPath(edge, pathItem);

  const fnGetPageInfo = data => getPath(data, pathPageInfo);

  const fnGetArray = data => fnGetEdges(data).map(o => fnGetItem(o))
  // const fnGetArray = data => {
  //   console.log(`fnGetArray`)
  //   console.log(data)
  //   console.log(fnGetEdges(data))
  //   console.log(fnGetEdges(data).map(o => fnGetItem(o)))

  //   return fnGetEdges(data).map(o => fnGetItem(o))
  // }
  const fnJoinResults = (currData, prevData) => fnSetEdges(currData, fnGetEdges(prevData).concat(fnGetEdges(currData)))

  return {
    //fnGetEdges,
    //fnSetEdges,
    fnJoinResults,
    //fnGetItem,
    fnGetArray,
    fnGetPageInfo
  };
};

export default getQueryPaths;
