import {useState, useEffect, useRef} from 'react'

const useEffectQuery = ( client, query, variables={}, fnGetData=(data)=>data ) => {

  const [data, setData] = useState(undefined)
  const [error, setError] = useState(undefined)
  const [loading, setLoading] = useState(undefined)

  const refObservableMain = useRef( undefined );
  const refSubsription = useRef( undefined );

  async function asyncFunction() {
    try {

      if (!refObservableMain.current) {
        setLoading(true)
      }
      refObservableMain.current = client.watchQuery({
        query,
        variables
      })

      refSubsription.current = refObservableMain.current.subscribe(
        resultNext => {
          // if (resultNext.networkStatus !==7) {
          //   return
          // }

          let newData = resultNext.data
          if (fnGetData) {
            newData = fnGetData(resultNext.data)
          }
          if (Array.isArray(newData)) {
            //newData = [ ...newData ]
            newData = newData.slice( )
          }else if ((!!newData) && (newData.constructor === Object)) {
            //newData = { ...newData0 }
            newData = Object.assign( {}, newData )
          }

          setData( newData ) 
          setError(undefined)
          setLoading(false)

        },
        err => {
          setError(err)
          setLoading(false)
        },
        () => {
          //console.log('watchQuery finished')
        }
      )

    }catch (e) {

      setLoading(false)
      setError(e)
    }
  }

  useEffect( () => {

    // console.log('react-apollo-hooks.js / useEffect')
    asyncFunction()

    return () => {
      // console.log('watchQuery unsubscribe')
      if (refSubsription.current) {
        refSubsription.current.unsubscribe()
      }
    }
  // eslint-disable-next-line 
  }, Object.keys(variables).map( key => variables[key] ) )

  return {
    loading,
    error,
    data,
    //timestamp
  }
}

export default useEffectQuery
