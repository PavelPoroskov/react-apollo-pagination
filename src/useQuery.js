import {useReducer, useEffect, useRef} from 'react'

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

const useQuery = ( client, query, variables={}, fnGetData=(data)=>data ) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const refObservableMain = useRef( undefined );
  const refSubsription = useRef( undefined );

  async function asyncFunction() {
    try {

      // if (!refObservableMain.current) {
      //   dispatch({type: 'start'})
      // }
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

          dispatch({type:'success', payload : newData})
        },
        err => {
          dispatch({type:'error', payload : err})
        },
        () => {
          //console.log('watchQuery finished')
        }
      )

    }catch (e) {
      dispatch({type:'error', payload : e})
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
    loading: state.loading,
    data: state.data,
    error: state.error
  }
}

export default useQuery
