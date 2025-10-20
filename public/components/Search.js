import { useState } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import { IoSearch } from 'react-icons/io5';

export default function Search() {
  const [search, setSearch] = useState('');

  return (
    <TextField
      placeholder="Search Here"
      value={search}
      onChange={e => setSearch(e.target.value)}
      variant="outlined"
      fullWidth
      sx={{
        backgroundColor: 'transparent',
        marginBottom: 4,
        '& .MuiOutlinedInput-root': {
          borderRadius: 25,
          minHeight: 40,
          fontSize: 16,
        },
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <IoSearch />
          </InputAdornment>
        ),
      }}
    />
  );
}