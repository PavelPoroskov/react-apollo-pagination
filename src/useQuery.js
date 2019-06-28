import {useReducer, useMemo, useEffect} from 'react'
import {options2arr} from './utils'

const initialState = {
  loading: true,
  data: null,
  error: null
};

function reducer(state, action) {
  switch (action.type) {
    case "start": {
      return {
        ...state,
        loading: true
      };
    }
    case "success":
      return {
        //...state,
        loading: false,
        data: action.payload,
        error: null
      };
    case "error":
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    default:
      throw new Error(
        `useQuery/reducer(): Unknown action.type ${action.type}`
      );
  }
}

// options = { query, variables }
const useQuery = ( client, options, fnGetData=(data)=>data ) => {
  const [state, dispatch] = useReducer(reducer, initialState);

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
      _observable = client.watchQuery({
        ...memoOptions,
        fetchPolicy: "network-only"
      });
    }catch (errWatch) {
      dispatch({ type: "error", payload: errWatch });
    }

    return _observable;
  }, [client, memoOptions] );

  useEffect(() => {
    if (!observableQuery) {
      return
    }
    const s = observableQuery.subscribe(
      resultNext => {
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

        dispatch({type:'success', payload : newData})
      },
      err => {
        dispatch({type:'error', payload : err})
      },
    );
    return () => s.unsubscribe();
  }, [observableQuery, fnGetData]);

  return {
    loading: state.loading,
    data: state.data,
    error: state.error
  }
}

export default useQuery
