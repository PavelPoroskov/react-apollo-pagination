import getQueryPaths from "./getQueryPaths";

function varibles2String(obj) {
  if (Array.isArray(obj)) {
    let arStr = obj.map(i => varibles2String(i)).join(",");
    return `[${arStr}]`;
  } else if (!!obj && obj.constructor === Object) {
    const arKeys = Object.keys(obj).sort();
    const arStr = arKeys
      .map(key => `${key}=${varibles2String(obj[key])}`)
      .join(",");
    return `{${arStr}}`;
  }

  return `${obj}`;
}

const getPageFetcher = (_client, _query, cbSuccess) => {
  const client = _client;
  const query = _query;
  let setCached = {};
  let mainObservable;
  let mainSubscription;

  const { fnGetEdges, fnSetEdges, fnGetArray, fnGetPageInfo } = getQueryPaths(
    query
  );

  return async function fetchSecondPage(variables) {
    // console.log("variables");
    // console.log(variables);
    // console.log("cbSuccess");
    // console.log(cbSuccess);
    const strVaribles = varibles2String(variables);
    const isQueryCached = strVaribles in setCached;
    // console.log(strVaribles)
    // console.log(`isQueryCached ${isQueryCached}`)

    if (!mainObservable) {
      try {
        // //test error throw
        // throw new Error('Test error 42')
        mainObservable = client.watchQuery({
          query,
          variables,
          fetchPolicy: "network-only"
        });
        // fetchPolicy: 'network-only'
        // get fresh data when
        //  1) localhost:3000/, pageNext
        //  2) to localhost:3000/search
        //  3) to localhost:3000/, must fetch fresh data

        // console.log('watchQuery subscribe')
        setCached[strVaribles] = true;
        mainSubscription = mainObservable.subscribe(
          resultNext => {
            console.log('resultNext')
            console.log(resultNext)
            let data = fnGetArray(resultNext.data);
            let pageInfo = fnGetPageInfo(resultNext.data);
            cbSuccess(data, pageInfo);
          },
          err => {
            throw err;
          },
          () => {
            //console.log('watchQuery finished')
          }
        );
        return mainSubscription;
      } catch (e) {
        throw e;
      }
    } else {
      try {
        let prevData = client.readQuery({ query });

        let options = { query, variables };
        if (!isQueryCached) {
          //          options['fetchPolicy'] = 'network-only'
          options["fetchPolicy"] = "no-cache";
        } else {
          cbSuccess(fnGetArray(prevData), fnGetPageInfo(prevData));
          return;
        }

        // //test error
        // throw new Error('Test error 86')

        const result = await client.query(options);
        setCached[strVaribles] = true;

        if (result.networkStatus === 7) {
          const currData = result.data;

          //write data to apollo cache
          fnSetEdges(
            currData,
            fnGetEdges(prevData).concat(fnGetEdges(currData))
          );
          client.writeQuery({
            query,
            data: currData
          });
        }
      } catch (er) {
        throw er;
      }
    }
  };
};

export default getPageFetcher;
