![npm](https://img.shields.io/npm/v/react-apollo-pagination.svg)  

# react-apollo-pagination  

A react hook for pagination in apollo-client.  

Support cursor-based relay pagination.  

## Demo   
```
https://codesandbox.io/s/xenodochial-waterfall-68ygx  
```
[Copy of prev link](https://codesandbox.io/s/xenodochial-waterfall-68ygx)  

## Requirements
server use relay cursor specification (<https://facebook.github.io/relay/graphql/connections.htm>)  
query must contain:  
* $first, $after,  
* @connection(key: "uniqname3"),  
* edges.node,  
* pageInfo  

## Usage  

### Install
```
npm install react-apollo-pagination
```
or  
```
yarn add react-apollo-pagination
```


```javascript
import React from "react";
import ApolloClientBoost, { gql } from "apollo-boost";
import { ApolloProvider, withApollo } from "react-apollo";
import { usePagination } from "react-apollo-pagination";

import TableView from "./TableView";

const client = new ApolloClientBoost({
  uri: "https://graphql-compose.herokuapp.com/userForRelay"
});

const FEED_QUERY = gql`
  query FeedQuery($first: Int, $after: String, $last: Int, $before: String, $sort: SortConnectionUserRelayEnum) {
    userConnection(first: $first, after: $after, last: $last, before: $before, sort: $sort ) @connection(key: "uniqname3") {
      edges {
        cursor
        node {
          id
          name
          age
          contacts {
            email
            phones
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;
const ITEMS_PER_PAGE = 4;

const styles = {
  container: { display: 'flex', width: '50%', justifyContent: 'space-around' },
  navlinkOn: { color: 'black', cursor: 'pointer'}, 
  navlinkOff: { color: 'gray', cursor: 'not-allowed'}, 
}

const PaginatedTableWithApollo = withApollo(function PaginatedTable(props) {
  const {
    hasPrevPage,
    goPrevPage,
    hasNextPage,
    goNextPage,
    loading,
    data,
    error,
    arPageNums,
    goPage,
    pageNum
  } = usePagination(props.client, { query: FEED_QUERY, variables: {sort: '_ID_ASC'} }, ITEMS_PER_PAGE);

  return (
    <React.Fragment>
      <h1>Cursor-based pagination Relay</h1>
      <TableView loading={loading} data={data} error={error} />
      <div style={styles.container}>
        <div
          style={ hasPrevPage ? styles.navlinkOn : styles.navlinkOff }
          onClick={goPrevPage}
        >
          Previous
        </div> 
        {pageNum}
        <div
          style={ hasNextPage ? styles.navlinkOn : styles.navlinkOff }
          onClick={goNextPage}
        >
          Next
        </div>
      </div>
    </React.Fragment>
  );
});

function App() {
  return (
    <ApolloProvider client={client}>
      <PaginatedTableWithApollo />
    </ApolloProvider>
  );
}

export default App;
```

## Roadmap  
* add offset-based pagination  
* add cursor-based pagination not-relay  
 