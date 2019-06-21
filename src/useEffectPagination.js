import { useReducer, useRef, useMemo } from "react";
import useConnection from "./useEffectConnection";

const initialState = {
  pageNum: 1,
  cursorAfter: null
};

function reducer(state, action) {
  switch (action.type) {
    case "setPage":
      console.log(`SET PAGE ${action.payload.pageNum}`)
      return {
        pageNum: action.payload.pageNum,
        cursorAfter: action.payload.cursorAfter
      };
    default:
      throw new Error(
        `usePagination/reducer(): Unknown action.type ${action.type}`
      );
  }
}

const usePagination = (client, query, variables = {}, _pageSize) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const refActual = useRef({
    pageNum: null,
    hasPrevPage: null,
    hasNextPage: null,
    arPageNums: [],
    arCursorAfter: [],
    data: null
  });

  //const nPage = parseInt(props.match.params.page, 10)
  let queryVariables = {
    ...variables,
    //orderBy: 'createdAt_DESC', //
    first: _pageSize,
    after: state.cursorAfter
  };

  const connection = useConnection(client, query, queryVariables )
  
  console.log(`refActual.current = useMemo( BEFORE`)
  refActual.current = useMemo( () => {
    console.log(`refActual.current = useMemo( IN`)
    console.log(connection)
    console.log(connection.data)
    // if (!connection.pageNum) {
    //   return refActual.current
    // }
    if (connection.loading || connection.error) {
      return refActual.current
    }
    if (connection.after !== state.cursorAfter) {
      return refActual.current
    }
    // if (connection.pageNum === refActual.current.pageNum) {
    //   return refActual.current
    // }

    //after success
    let pageNum = state.pageNum
    let arPageNums = refActual.current.arPageNums.length < pageNum ? refActual.current.arPageNums.concat([pageNum]) : refActual.current.arPageNums
    let arCursorAfter = refActual.current.arPageNums.length < pageNum ? refActual.current.arCursorAfter.concat([state.cursorAfter]) : refActual.current.arCursorAfter

    return {
      pageNum,
      arPageNums,
      arCursorAfter,
      hasPrevPage: 1 < pageNum,
      hasNextPage: ((pageNum === arPageNums.length) && connection.pageInfo.hasNextPage) || (pageNum < arPageNums.length),
      data: connection.data.slice( (pageNum - 1)*_pageSize, pageNum*_pageSize )
    }
  }, [state.pageNum, state.cursorAfter, connection, _pageSize, ] );
  console.log(`refActual.current = useMemo( AFTER`)
  console.log(refActual.current)

  const goNextPage = () => {
    if (connection.loading) {
      return;
    }
    if (!refActual.current.hasNextPage) {
      return;
    }

    let pageNum = refActual.current.pageNum + 1
    let cursorAfter = refActual.current.pageNum === refActual.current.arPageNums.length ? connection.pageInfo.endCursor : refActual.current.arCursorAfter[pageNum-1]
    dispatch({
      type: "setPage",
      payload: {
        pageNum,
        cursorAfter
      }
    })
  };
  const goPrevPage = () => {
    if (connection.loading) {
      return;
    }
    if (!refActual.current.hasPrevPage) {
      return;
    }

    let pageNum = refActual.current.pageNum - 1
    let cursorAfter = refActual.current.arCursorAfter[pageNum-1]
    dispatch({
      type: "setPage",
      payload: {
        pageNum,
        cursorAfter
      }
    })
  };

  return {
    loading: connection.loading,
    error: connection.error,
    data: refActual.current.data,
    //dataAll,
    //dataPage,
    hasPrevPage: refActual.current.hasPrevPage,
    goPrevPage,
    hasNextPage: refActual.current.hasNextPage,
    goNextPage,
    arPageNums: refActual.current.hasNextPage,
    pageNum: refActual.current.pageNum,
    // ?fnRefetchFistPage
  };
};

export default usePagination;

