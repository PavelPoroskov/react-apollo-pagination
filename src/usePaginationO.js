import { useReducer, useRef, useEffect, useMemo, useCallback } from "react";

import getQueryPaths from "./getQueryPaths";

const initialState = {
  intentionPageNum: 1,
  intensionCursorAfter: null,
  timestamp: 0,

  loading: true,
  error: null,
  // loadingFirst: true

  pageNum: null,
  hasPrevPage: null,
  hasNextPage: null,
  arPageNums: [],
  arCursorAfter: [],
  data: null,
  pageInfo: null,
  lastPageNum: null
};

function reducer(state, action) {
  switch (action.type) {
    case "setPageNext": {
      const intentionPageNum = state.pageNum + 1;
      const intensionCursorAfter =
        state.pageNum === state.arPageNums.length
          ? state.pageInfo.endCursor
          : state.arCursorAfter[intentionPageNum - 1];
      // todo:
      //   get cursor of last item on the page

      console.log(`reducer setPageNext ${intentionPageNum}`);
      return {
        ...state,
        intentionPageNum,
        intensionCursorAfter,
        loading: true,
        error: null,
        //to repeat after Error
        timestamp: Date.now()
      };
    }
    case "setPagePrev": {
      const intentionPageNum = state.pageNum - 1;
      const intensionCursorAfter = state.arCursorAfter[intentionPageNum - 1];
      console.log(`reducer setPagePrev ${intentionPageNum}`);
      return {
        ...state,
        intentionPageNum,
        intensionCursorAfter,
        loading: true,
        error: null
      };
    }
    case "setPage": {
      const intentionPageNum = action.payload;
      const intensionCursorAfter = state.arCursorAfter[intentionPageNum - 1];
      console.log(`reducer setPagePrev ${intentionPageNum}`);
      return {
        ...state,
        intentionPageNum,
        intensionCursorAfter,
        loading: true,
        error: null
      };
    }
    case "success":
      const { data, pageInfo, pageSize } = action.payload;
      //if intentional page is empty, dont go to intensional page
      const pageNum = state.intentionPageNum;
      const arPageNums =
        state.arPageNums.length < pageNum
          ? state.arPageNums.concat([pageNum])
          : state.arPageNums;
      const arCursorAfter =
        state.arPageNums.length < pageNum
          ? state.arCursorAfter.concat([state.intensionCursorAfter])
          : state.arCursorAfter;
      // console.log('data')
      // console.log(data)
      const dataPage = data.slice((pageNum - 1) * pageSize, pageNum * pageSize);

      //let hasNextPage = (pageNum === arPageNums.length && pageInfo.hasNextPage) || pageNum < arPageNums.length
      //const hasNextPage = pageNum < arPageNums.length || (pageNum === arPageNums.length && pageInfo.hasNextPage)
      let hasNextPage = true;
      let lastPageNum = state.lastPageNum;
      if (state.lastPageNum) {
        hasNextPage = pageNum < state.lastPageNum;
      } else if (dataPage.length < pageSize) {
        hasNextPage = false;
        lastPageNum = pageNum;
      }

      if (Array.isArray(dataPage) && dataPage.length === 0) {
        return {
          ...state,
          loading: false,
          hasNextPage: false,
          lastPageNum: state.pageNum
        };
      }

      return {
        ...state,
        loading: false,
        pageNum,
        arPageNums,
        arCursorAfter,
        hasPrevPage: 1 < pageNum,
        hasNextPage,
        data: dataPage,
        pageInfo,
        lastPageNum
      };
    case "error":
      console.log("reducer: error");
      return {
        ...state,
        error: action.payload,
        loading: false
        // bad option: becouse
        // intensionCursorAfter: (state.pageNum && state.arCursorAfter[state.pageNum]) || null

        // // ?set lastPageNum on error
        // hasNextPage: false,
        // lastPageNum: state.pageNum
      };
    default:
      throw new Error(
        `usePagination/reducer(): Unknown action.type ${action.type}`
      );
  }
}

const usePagination = (client, query, variables = {}, pageSize) => {
  const refCached = useRef({});
  const [state, dispatch] = useReducer(reducer, initialState);
  const { fnGetEdges, fnSetEdges, fnGetArray, fnGetPageInfo } = useMemo(
    () => getQueryPaths(query),
    [query]
  );

  const observableQuery = useMemo(() => {
    const _observable = client.watchQuery({
      query,
      variables: {
        ...variables,
        after: null,
        first: pageSize
      },
      fetchPolicy: "network-only"
    });
    refCached.current["null"] = true;

    return _observable;
    // eslint-disable-next-line
  }, [client, query, pageSize].concat(Object.keys(variables).map(key => variables[key])));

  const fnSuccess = useCallback(
    data => {
      dispatch({
        type: "success",
        payload: {
          data: fnGetArray(data),
          pageInfo: fnGetPageInfo(data),
          pageSize
        }
      });
    },
    [fnGetArray, fnGetPageInfo, pageSize]
  );

  useEffect(() => {
    const s = observableQuery.subscribe(result => {
      // console.log("cbSuccess");
      // console.log(result.data);
      fnSuccess(result.data);
    });
    return () => s.unsubscribe();
  }, [observableQuery, fnSuccess]);

  useEffect(() => {
    async function asyncFunctionInEffect() {
      //console.log("useEffect");
      if (!state.pageNum) {
        return
      }
      try {
        let prevData = client.readQuery({ query });
        let options = {
          query,
          variables: {
            ...variables,
            //orderBy: 'createdAt_DESC', //
            first: pageSize,
            after: state.intensionCursorAfter
          }
        };
        // console.log('refCached.current')
        // console.log(refCached.current)
        const isQueryCached = state.intensionCursorAfter
          ? state.intensionCursorAfter in refCached.current
          : "null" in refCached.current;
        if (!isQueryCached) {
          //          options['fetchPolicy'] = 'network-only'
          options["fetchPolicy"] = "no-cache";
        } else {
          fnSuccess(prevData);
          return;
        }

        const result = await client.query(options);
        const strVaribles = state.intensionCursorAfter
          ? state.intensionCursorAfter
          : "null";
        refCached.current[strVaribles] = true;

        const currData = result.data;
        fnSetEdges(currData, fnGetEdges(prevData).concat(fnGetEdges(currData)));
        client.writeQuery({
          query,
          data: currData
        });
      } catch (errFetchPage) {
        dispatch({ type: "error", payload: errFetchPage });
      }
    }

    asyncFunctionInEffect();
    // }, [state.intensionCursorAfter, pageSize, variables]);
    // eslint-disable-next-line
  }, [state.intensionCursorAfter, state.timestamp, pageSize].concat(Object.keys(variables).map(key => variables[key])));

  const goNextPage = () => {
    if (state.loading) {
      return;
    }
    if (!state.hasNextPage) {
      return;
    }

    dispatch({ type: "setPageNext" });
  };

  const goPrevPage = () => {
    if (state.loading) {
      return;
    }
    if (!state.hasPrevPage) {
      return;
    }

    dispatch({ type: "setPagePrev" });
  };
  const goPage = _pageNum => {
    if (state.loading) {
      return;
    }

    dispatch({ type: "setPage", payload: _pageNum });
  };

  return {
    loading: state.loading,
    error: state.error,
    data: state.data,
    //dataAll,
    //dataPage,
    hasPrevPage: state.hasPrevPage,
    goPrevPage,
    hasNextPage: state.hasNextPage,
    goNextPage,
    goPage,
    arPageNums: state.hasNextPage,
    pageNum: state.pageNum
    // ?fnRefetchFistPage
  };
};

export default usePagination;
