import {
  useReducer,
  useRef,
  useEffect //,useMemo
} from "react";

import getPageFetcher from "./getPageFetcher";

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
        loading: false,
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

const usePagination = (client, query, variables = {}, _pageSize) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const refFetchPage = useRef(
    getPageFetcher(client, query, (data, pageInfo) => {
      console.log("cbSuccess");
      dispatch({
        type: "success",
        payload: {
          data,
          pageInfo,
          pageSize: _pageSize
        }
      });
    })
  );
  const refMainSubscription = useRef(null);

  useEffect(() => {
    async function asyncFunctionInEffect() {
      console.log("useEffect");
      try {
        let queryVariables = {
          ...variables,
          //orderBy: 'createdAt_DESC', //
          first: _pageSize,
          after: state.intensionCursorAfter
        };
        const mainSubscription = await refFetchPage.current(queryVariables);
        if (!refMainSubscription.current) {
          refMainSubscription.current = mainSubscription;
        }
      } catch (errFetchPage) {
        dispatch({ type: "error", payload: errFetchPage });
      }
    }

    asyncFunctionInEffect();
    // }, [state.intensionCursorAfter, _pageSize, variables]);
    // eslint-disable-next-line
  }, [state.intensionCursorAfter, state.timestamp, _pageSize].concat(Object.keys(variables).map(key => variables[key])));

  useEffect(() => {
    return () => {
      if (refMainSubscription.current) {
        refMainSubscription.current.unsubscribe();
      }
    };
  }, []);

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
