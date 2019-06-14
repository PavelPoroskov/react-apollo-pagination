import {useState, useRef} from 'react'
import useEffectConnection from './useEffectConnection'


const useEffectPagination = ( client, query, variables={}, pageSize ) => {

  const [cursorAfter, setCursorAfter] = useState(null)
  //const [cursorBefore, setCursorBefore] = useState(null)
  const [isForward, setIsForward] = useState(true)

  const refPrevPageIndex = useRef(0)
  const refPageIndex = useRef(0)
  //const [refPageIndex.current, setPageIndex] = useState(0)
  const refPrevCursorAfter = useRef([null])

  //const nPage = parseInt(props.match.params.page, 10)
  let queryVariables = {
    ...variables,
    //orderBy: 'createdAt_DESC', //
    first: pageSize,
    after: cursorAfter
  }

  const propsLoading = useEffectConnection( client, query, queryVariables )

  const hasNextPage = () => {
    if (isForward && propsLoading.error) {
      return false
    }

    if (propsLoading.data) {
      const pgi = propsLoading.pageInfo
      if ((isForward && pgi.hasNextPage) || (refPageIndex.current < refPrevCursorAfter.current.length-1) ) {
        return true
      }
    }

    return false
  }
  const goNextPage = () => {
    if (!hasNextPage()) {
      return
    }

    setIsForward(true)
    refPrevPageIndex.current = refPageIndex.current
    refPageIndex.current = refPageIndex.current + 1

    if (refPrevCursorAfter.current.length <= refPageIndex.current ) {
      const pgi = propsLoading.pageInfo
      refPrevCursorAfter.current.push(pgi.endCursor)
    }
    setCursorAfter(refPrevCursorAfter.current[refPageIndex.current])
  }
  const hasPrevPage = () => {

    return (0 < refPageIndex.current)
  }
  const goPrevPage = () => {
    if (!hasPrevPage()) {
      return
    }

    setIsForward(false)

    refPrevPageIndex.current = refPageIndex.current
    refPageIndex.current = refPageIndex.current - 1
    setCursorAfter(refPrevCursorAfter.current[refPageIndex.current])
  }

  const getData = () => {

    if (propsLoading.error) {
      return null
    }

    if (propsLoading.data) {
      //todo-
      //let newData = propsLoading.data.edges.map( o => o.node )
      let newData = propsLoading.data
      // //incremental 
      // return newData
      
      //pages
      if (refPageIndex.current*pageSize <= newData.length -1) {
        newData = newData.slice( refPageIndex.current*pageSize, (refPageIndex.current + 1)*pageSize )
      }else{
        newData = newData.slice( refPrevPageIndex.current*pageSize, (refPrevPageIndex.current + 1)*pageSize )
      }

      return newData
    }
    return null
  }
  // async function asyncFunction() {

  // }

  // useEffect( () => {

  //   //console.log('react-apollo-hooks.js / useEffectApolloConnection')

  //   asyncFunction()

  // }, [] )

  return {
    loading: propsLoading.loading,
    error: propsLoading.error,
    data: getData(), 
    //dataAll,
    //dataPage,
    hasPrevPage: hasPrevPage(), 
    goPrevPage, 
    hasNextPage: hasNextPage(), 
    goNextPage, 
    totalBefore: refPageIndex.current*pageSize
  }
}

export default useEffectPagination