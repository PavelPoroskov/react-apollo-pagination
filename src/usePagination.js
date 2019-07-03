import { useReducer, useRef, useEffect, useMemo } from 'react';

import getQueryPaths from './getQueryPaths';
import {options2arr} from './utils'

function initState(_pageSize) {
  return {
    pageSize: _pageSize,

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
    data: null, //dataPage
    // dataAll: null,
    pageInfo: null,
    lastPageNum: null,
  }
}

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

      if (process.env.NODE_ENV==='development') {
        console.log(`reducer setPageNext ${intentionPageNum}`);
      }  
    
      // if (intentionPageNum <= state.arPageNums.length) {

      //   const pageNum = intentionPageNum;
        // const pageSize = state.pageSize
      //   const dataPage = state.dataAll.slice((pageNum - 1) * pageSize, pageNum * pageSize);

      //   let hasNextPage = true;
      //   if (state.lastPageNum) {
      //     hasNextPage = pageNum < state.lastPageNum;
      //   }

      //   return {
      //     ...state,
      //     pageNum,
      //     hasNextPage,
      //     hasPrevPage: 1 < pageNum,
      //     data: dataPage
      //   };
      // }

      return {
        ...state,
        intentionPageNum,
        intensionCursorAfter,
        // loading: true,
        loading: state.arPageNums.length < intentionPageNum,
        error: null,
        //to repeat after Error
        timestamp: Date.now()
      };
    }
    case "setPagePrev": {
      const intentionPageNum = state.pageNum - 1;
      const intensionCursorAfter = state.arCursorAfter[intentionPageNum - 1];

      if (process.env.NODE_ENV==='development') {
        console.log(`reducer setPagePrev ${intentionPageNum}`);
      }  

      return {
        ...state,
        intentionPageNum,
        intensionCursorAfter,
        // loading: true,
        loading: false,
        error: null
      };
      // const pageNum = intentionPageNum;
      // const pageSize = state.pageSize
      // const dataPage = state.dataAll.slice((pageNum - 1) * pageSize, pageNum * pageSize);

      // let hasNextPage = true;
      // if (state.lastPageNum) {
      //   hasNextPage = pageNum < state.lastPageNum;
      // }

      // return {
      //   ...state,
      //   pageNum,
      //   hasPrevPage: 1 < pageNum,
      //   hasNextPage,
      //   data: dataPage
      // };
    }
    case "setPage": {
      const intentionPageNum = action.payload;
      const intensionCursorAfter = state.arCursorAfter[intentionPageNum - 1];
      if (process.env.NODE_ENV==='development') {
        console.log(`reducer setPagePrev ${intentionPageNum}`);
      }  

      return {
        ...state,
        intentionPageNum,
        intensionCursorAfter,
        // loading: true,
        loading: false,
        error: null
      };
    }
    case "success":
      const { data, pageInfo } = action.payload;
      const pageSize = state.pageSize
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
      // console_log('data')
      // console_log(data)
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
        // dataAll: data,
        pageInfo,
        lastPageNum
      };
    case "error":
      if (process.env.NODE_ENV==='development') {
        console.log("reducer: error");
      }  

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


function usePagination (client, options, pageSize) {
  const refCached = useRef({});
  const [state, dispatch] = useReducer(reducer, initState(pageSize) );

  const memoOptions = useMemo(
    () => {
      if (process.env.NODE_ENV==='development') {
        console.log('useMemo memoRestOptions')
      }      
      const {variables, ...restOptions} = options
      return {variables: variables || {}, ...restOptions }
    },
    // eslint-disable-next-line
    options2arr(options)
  );
  const { fnJoinResults, fnGetArray, fnGetPageInfo } = useMemo(
    () => getQueryPaths(memoOptions.query),
    [memoOptions.query]
  );

  const observableQuery = useMemo(() => {
    let _observable
    try {
      _observable = client.watchQuery({
        ...memoOptions,
        variables: {
          ...memoOptions.variables,
          after: null,
          first: pageSize
        },
        fetchPolicy: "network-only"
      });
      refCached.current = { "null": true };
    }catch (errWatch) {
      dispatch({ type: "error", payload: errWatch });
    }

    return _observable;
  }, [client, memoOptions, pageSize] );

  useEffect(() => {
    if (!observableQuery) {
      return
    }
    const s = observableQuery.subscribe(result => {
      dispatch({
        type: "success",
        payload: {
          data: fnGetArray(result.data),
          pageInfo: fnGetPageInfo(result.data)
        }
      });
    },
    errSubscr => {
      dispatch({ type: "error", payload: errSubscr });
    } );
    return () => s.unsubscribe();
  }, [observableQuery, fnGetArray, fnGetPageInfo]);

  useEffect(() => {
    async function asyncFunctionInEffect() {
      //1) not need for first page
      // if (!state.pageNum) {
      if (!state.timestamp) {
      //-2) return to first page will be processed in reducer
      // if (!state.intensionCursorAfter) {          
        return
      }
      // if (process.env.NODE_ENV==='development') {
      //   console.log("asyncFunctionInEffect");
      // }  
      try {
        let prevData = client.readQuery({ query: memoOptions.query });
        const isQueryCached = state.intensionCursorAfter
          ? state.intensionCursorAfter in refCached.current
          : "null" in refCached.current;
        if (isQueryCached) {
          //- it will be processed in reduce
          dispatch({
            type: "success",
            payload: {
              data: fnGetArray(prevData),
              pageInfo: fnGetPageInfo(prevData)
            }
          });
          return;
        }
  
        let options = {
          ...memoOptions,
          variables: {
            ...memoOptions.variables,
            first: pageSize,
            after: state.intensionCursorAfter
          },
          // fetchPolicy: 'network-only',
          fetchPolicy: 'no-cache'
        };

        const result = await client.query(options);
        const strVaribles = state.intensionCursorAfter
          ? state.intensionCursorAfter
          : "null";
        refCached.current[strVaribles] = true;

        const currData = result.data;
        fnJoinResults(currData, prevData);
        client.writeQuery({
          query: memoOptions.query,
          data: currData
        });
      } catch (errFetchPage) {
        dispatch({ type: "error", payload: errFetchPage });
      }
    }

    asyncFunctionInEffect();
    // }, [state.intensionCursorAfter, pageSize, variables]);
  }, [client, memoOptions, pageSize, fnGetArray, fnGetPageInfo, fnJoinResults, state.intensionCursorAfter, state.timestamp ] );

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
    if (!_pageNum) {
      return;
    }
    if (!( 0 < _pageNum && _pageNum <= state.arPageNums.length)) {
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
