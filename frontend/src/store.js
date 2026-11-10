import { configureStore, createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "./api";

export const fetchHotels = createAsyncThunk("hotels/fetch", async (params) => {
  const { data } = await api.get("/hotels", { params });
  return data;
});

const hotelSlice = createSlice({
  name: "hotels",
  initialState: { items: [], total: 0, loading: false, error: "" },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHotels.pending, (state) => { state.loading = true; state.error = ""; })
      .addCase(fetchHotels.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.hotels;
        state.total = action.payload.total;
      })
      .addCase(fetchHotels.rejected, (state) => {
        state.loading = false;
        state.error = "Unable to load hotels. Check that the backend and database are running.";
      });
  }
});

export const store = configureStore({ reducer: { hotels: hotelSlice.reducer } });
