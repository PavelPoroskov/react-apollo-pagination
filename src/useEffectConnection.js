import { useReducer, useEffect, useRef, useMemo } from "react";

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

const initialState = {
  // status: 'loading',
  loadingFirst: true,
  loading: true,
  data: null,
  error: null,
  pageInfo: null
};

function reducer(state, action) {
  switch (action.type) {
    // case "start":
    //   return {
    //     ...state,
    //     loading: true,
    //     status: action.type
    //   };
    case "success":
      console.log(`useConnection: success`);
      // console.log( action.payload.data)
      return {
        ...state,
        loading: false,
        loadingFirst: false,
        // stupid err
        // data: action.payload.date,
        data: action.payload.data,
        pageInfo: action.payload.pageInfo,
        error: null
        // status: action.type
      };
    case "error":
      return {
        ...state,
        loading: false,
        loadingFirst: false,
        pageInfo: null,
        error: action.payload

        // status: action.type
      };
    default:
      throw new Error(
        `useConnection/reducer(): Unknown action.type ${action.type}`
      );
  }
}

const useConnection = (client, query, variables = {}, cbSuccess) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const refObservableMain = useRef(undefined);
  const refMainSubscription = useRef(undefined);
  const refCacheVariables = useRef({});

  const { fnGetEdges, fnSetEdges, fnGetArray, fnGetPageInfo } = useMemo(
    () => getQueryPaths(query),
    [query]
  );

  console.log('>>>> useConnection START')
  async function asyncFunction() {

    try {
      const strVaribles = varibles2String(variables);
      const isQueryCached = strVaribles in refCacheVariables.current;

      refCacheVariables.current[strVaribles] = true;

      // if (!refObservableMain.current) {
      //   dispatch({ type: 'start' });
      // }

      if (!refObservableMain.current) {
        refObservableMain.current = client.watchQuery({
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
        refMainSubscription.current = refObservableMain.current.subscribe(
          resultNext => {
            let data = fnGetArray(resultNext.data)
            let pageInfo = fnGetPageInfo(resultNext.data)
            //cbSuccess(data, pageInfo)
            dispatch({
              type: "success",
              payload: {
                data,
                pageInfo
              }
            });
          },
          err => {
            dispatch({ type: "error", payload: err });
          },
          () => {
            //console.log('watchQuery finished')
          }
        );
      } else {
        let prevData = client.readQuery({ query });

        let options = { query, variables };
        if (!isQueryCached) {
          //          options['fetchPolicy'] = 'network-only'
          options["fetchPolicy"] = "no-cache";
        } else {
          return;
        }

        //write data to apollo cache
        try {
          const result = await client.query(options);

          if (result.networkStatus === 7) {
            const currData = result.data;

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
          dispatch({ type: "error", payload: er });
        }
      }
    } catch (e) {
      dispatch({ type: "error", payload: e });
    }
  }

  useEffect(() => {
    asyncFunction();

    // eslint-disable-next-line
  }, Object.keys(variables).map(key => variables[key]));

  useEffect(() => {
    return () => {
      //console.log('watchQuery unsubscribe')
      if (refMainSubscription.current) {
        refMainSubscription.current.unsubscribe();
      }
    };
  }, []);

  return {
    loading: state.loading,
    data: state.data,
    pageInfo: state.pageInfo,
    error: state.error,
    after: variables.after
  };
};

export default useConnection;
