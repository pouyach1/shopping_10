export interface CustomerData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  province: string;
  city: string;
  postalCode: string;
  address: string;
  landline: string;
  description: string;
}

export const EMPTY_CUSTOMER: CustomerData = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  province: '',
  city: '',
  postalCode: '',
  address: '',
  landline: '',
  description: '',
};