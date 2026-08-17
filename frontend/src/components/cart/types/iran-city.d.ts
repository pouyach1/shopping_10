declare module 'iran-city' {

  interface Province {
    id: number;
    name: string;
  }

  interface City {
    id: number;
    name: string;
  }

  const iranCity: {
    allProvinces(): Province[];

    citiesOfProvince(
      provinceId: number
    ): City[];

    allCities(): City[];

    searchByName(
      name: string
    ): City[];

    cityByName(
      name: string
    ): City | undefined;

    cityById(
      id: number
    ): City | undefined;
  };


  export default iranCity;

}