import {useMemo, useEffect} from 'react'
import {options2arr} from './utils'


const useSubscription = ( client, options, fnToCache ) => {

  const memoOptions = useMemo(
    () => {
      // if (process.env.NODE_ENV==='development') {
      //   console.log('useMemo memoRestOptions')
      // }      
      const {variables, ...restOptions} = options
      return {variables: variables || {}, ...restOptions }
    },
    // eslint-disable-next-line
    options2arr(options)
  );

  const observableQuery = useMemo(() => {
    let _observable
    try {
      _observable = client.subscribe(memoOptions);
    }catch (errWatch) {
      //error
    }
    return _observable;
  }, [client, memoOptions] );

  useEffect(() => {
    if (!observableQuery) {
      return
    }
    const s = observableQuery.subscribe(
      resultNext => {
        if (fnToCache) {
          fnToCache(resultNext.data)
        }
      },
      err => {
        //dispatch({type:'error', payload : err})
      },
    );
    return () => s.unsubscribe();
  }, [observableQuery, fnToCache]);

}

export default useSubscription