import {useState, useEffect, useRef} from 'react'

// const fnGetEdges = (data) => data.feedConnection.edges
// const fnSetEdges = (data, edges) => { data.feedConnection.edges = edges }
// const fnGetItem = (edge) => edge.node

const getPath = (obj, arPath) => {
  let res = obj
  for (let sub of arPath) {
    res = res[sub]
  }
  return res
}
const setPath = (obj, _arPath, data) => {
  let subPath = _arPath.slice(0, _arPath.length - 1)
  let lastSubPath = _arPath[_arPath.length - 1]
  let subObj = getPath(obj, subPath)
  subObj[lastSubPath] = data
}

const useEffectConnection = ( client, query, variables={} ) => {

  const [data, setData] = useState(undefined)
  const [error, setError] = useState(undefined)
  const [loading, setLoading] = useState(undefined)
  const [pageInfo, setPageInfo] = useState(undefined)

  const refObservableMain = useRef( undefined )
  const refMainSubscription = useRef( undefined )

  const refCacheVariables = useRef( {} )
//  const refObsvSubsriptions = useRef( [] );

  const refPahEdges = useRef( [] )
  const refPahPageInfo = useRef( [] )
  const refPahItem = useRef( [] )

  useEffect( () => {
    let definitions = query.definitions
    let pathEdges = []
    let pathPageInfo = []
    let pathItem = []

    let haveEdges = false
    let havePageInfo = false
    //let haveItem = false

    for (let def of definitions) {
      if (def.operation==='query') {
        for (let sel of def.selectionSet.selections) {

          let directiveConnection = false
          for (let dir of sel.directives) {
            if (dir.name.value==='connection') {
              directiveConnection = true
              break
            }
          }

          if (directiveConnection) {
            pathEdges.push(sel.name.value)
            pathPageInfo.push(sel.name.value)

            for (let sel2 of sel.selectionSet.selections) {
              if (sel2.name.value==='edges') {
                pathEdges.push(sel2.name.value)
                haveEdges = true
                for (let sel3 of sel2.selectionSet.selections) {
                  if (sel3.name.value==='node') {
                    pathItem.push(sel3.name.value)
                    //haveItem = true
                    break
                  }
                }
              }else if (sel2.name.value==='pageInfo') {
                pathPageInfo.push(sel2.name.value)
                havePageInfo = true
              }

              if (haveEdges && havePageInfo) {
                break
              }
            }
          }

          if (haveEdges && havePageInfo) {
            break
          }

        }
      }

      if (haveEdges && havePageInfo) {
        break
      }
    }

    refPahEdges.current = pathEdges
    refPahPageInfo.current = pathPageInfo
    refPahItem.current = pathItem

  }, [query.definitions] )

  //const fnGetEdges = (data) => data.feedConnection.edges
  const fnGetEdges = (data) => getPath( data, refPahEdges.current )
  //const fnSetEdges = (data, edges) => { data.feedConnection.edges = edges }
  const fnSetEdges = (data, edges) => { setPath( data, refPahEdges.current, edges ) }
//  const fnGetItem = (edge) => edge.node
  const fnGetItem = (edge) => getPath( edge, refPahItem.current )
  const fnGetPageInfo = (data) => getPath( data, refPahPageInfo.current )
  
  function varibles2String(obj) {

    if (Array.isArray(obj)) {
      let arStr = obj.map( i => varibles2String(i) ).join(',')
      return `[${arStr}]`

    }else if ((!!obj) && (obj.constructor === Object)) {
      const arKeys = Object.keys(obj).sort()
      const arStr = arKeys.map( key => `${key}=${varibles2String(obj[key])}`).join(',')
      return `{${arStr}}`
    }

    return `${obj}`
  }

  async function asyncFunction() {
    try {
      const strVaribles = varibles2String(variables)
      const isQueryCached = strVaribles in refCacheVariables.current

      // console.log(`refCacheVariables: begin`)
      refCacheVariables.current[strVaribles] = true
      // console.log(`refCacheVariables: end`)

      if (!refObservableMain.current) {
        setLoading(true)
      }

      if (!refObservableMain.current) {
        refObservableMain.current = client.watchQuery({ query, variables, fetchPolicy: 'network-only' })
        // fetchPolicy: 'network-only'
        // get fresh data when
        //  1) localhost:3000/, pageNext
        //  2) to localhost:3000/search
        //  3) to localhost:3000/, must fetch fresh data

        // console.log('watchQuery subscribe')
        refMainSubscription.current = refObservableMain.current.subscribe(
          resultNext => {
            // console.log(`watchQuery: next()`)
            // console.log(resultNext)

            //let newData = resultNext
            //if (fnGetData) {
            let newData = fnGetEdges(resultNext.data).map( o => fnGetItem(o) )
              if (Array.isArray(newData)) {
                // //newData = [ ...newData ]
                newData = newData.slice( )

                // const rest = newData.length % variables.first
                // newData = newData.slice( rest ? -rest: -variables.first )

              }else if ((!!newData) && (newData.constructor === Object)) {
                //newData = { ...newData0 }
                newData = Object.assign( {}, newData )
              }
            //}

            //console.log(`watchQuery: setData()`)
            //console.log(newData)
            setPageInfo( fnGetPageInfo(resultNext.data) ) 
            setData( newData ) 
            setError(undefined)
            setLoading(false)
            // console.log(`watchQuery: setData() end`)
          },
          err => {
            setError(err)
            setLoading(false)
          },
          () => {
            //console.log('watchQuery finished')
          }
        )

      }else{

        let prevData = client.readQuery({ query })

        let options = { query, variables }
        if (!isQueryCached) {
//          options['fetchPolicy'] = 'network-only'
          options['fetchPolicy'] = 'no-cache'
        }else {
          return
        }

        try {
          //console.log('client.query')
          const result = await client.query(options)

          if (result.networkStatus ===7) {
            const currData = result.data

            //if (prevData.feedConnection) {

              fnSetEdges( currData, fnGetEdges(prevData).concat( fnGetEdges(currData) )  )
              // let feedConnection = Object.assign( {}, currData.feedConnection, {
              //   edges: [...prevData.feedConnection.edges, ...currData.feedConnection.edges ] 
              // })
              client.writeQuery({ 
                query, 
                data: currData
              })
              //console.log('client.query end')
              //console.log(result)
            //}
          }
        }catch(er) {

        }
        
      }

    }catch (e) {

      setLoading(false)
      setError(e)
    }
  }

  useEffect( () => {

    //console.log('react-apollo-hooks.js / useEffectApolloConnection')

    asyncFunction()

  // eslint-disable-next-line 
  }, Object.keys(variables).map( key => variables[key] ) )

  useEffect( () => {

    return () => {
      //console.log('watchQuery unsubscribe')
      if (refMainSubscription.current) {
        refMainSubscription.current.unsubscribe()
      }
    }
  }, [] )

  // //graphql subscriptions
  // useEffect( () => {

  //   if (Array.isArray(_arSubscriptions)) {
  //     for (let subscribtion of _arSubscriptions) {
  //       console.log('Subscription level 2: begin')
  //       const obserableSub = client.subscribe({
  //         query: subscribtion.query,
  //         variables
  //       })
  //       const subscriptionSlave = obserableSub.subscribe(
  //         resultNextSub => {
  //           if (subscribtion.fnToCache) {
  //             subscribtion.fnToCache(resultNextSub)
  //           }
  //         }
  //       )
  //       refObsvSubsriptions.current.push(subscriptionSlave)
  //     }
  //   } 

  //   return () => {
  //     if (refObsvSubsriptions.current && Array.isArray(refObsvSubsriptions.current) ) {
  //       for (let obsvSubscription of refObsvSubsriptions.current) {
  //         obsvSubscription.unsubscribe()
  //       }
  //     }
  //   }
  // }, [] )

  return {
    loading,
    error,
    data,
    pageInfo,
  }
}

export default useEffectConnection