import { useState } from 'react';
import { SearchBar } from 'react-native-elements';

export default function Search() {
  const [search, setSearch] = useState('');

  return (
    <SearchBar
      placeholder="Search Here"
      onChangeText={setSearch}
      value={search}
      platform="default"
      round
      lightTheme
      containerStyle={{
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        borderBottomWidth: 0,
        marginBottom: 32,
        padding: 0, 
      }}
      inputContainerStyle={{
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#000',
        borderRadius: 25,
        minHeight: 40, 
        paddingVertical: 0,
      }}
      inputStyle={{
        fontSize: 16, 
        padding: 0,
        paddingVertical: 0,
      }}
    />
  );
}