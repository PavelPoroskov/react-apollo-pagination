import {useEffect, useRef} from 'react'


const useEffectSubscription = ( client, query, variables={}, fnToCache ) => {

  const refSubsription = useRef( undefined );

  async function asyncFunction() {
    try {

      let observableMain = client.subscribe({
        query,
        variables
      })

      refSubsription.current = observableMain.subscribe(
        resultNext => {
          // console.log('useEffectSubscription finished')
          // console.log(resultNext)
          
          if (fnToCache) {
            fnToCache(resultNext.data)
          }
        },
        err => {
          // console.log('useEffectSubscription error')
        },
        () => {
          // console.log('useEffectSubscription finished')
        }
      )

    }catch (e) {
      // console.log('useEffectSubscription catch')
      // console.log(e)
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

}

export default useEffectSubscription