import { useMemo } from 'react';
import iranCity from 'iran-city';
import type { CustomerData } from '../../../types/user';
import styles from './CustomerForm.module.css';

interface CustomerFormProps {
  data: CustomerData;
  onChange: (data: CustomerData) => void;
}

export function CustomerForm({
  data,
  onChange,
}: CustomerFormProps) {

  const provinces = useMemo(() => {
    return iranCity.allProvinces();
  }, []);

  const cities = useMemo(() => {
    if (!data.province) return [];

    return iranCity.citiesOfProvince(
      Number(data.province)
    );
  }, [data.province]);


  const updateField = (
    field: keyof CustomerData,
    value: string
  ) => {
    onChange({
      ...data,
      [field]: value,
    });
  };


  return (
    <section className={styles.section} dir="rtl">

      <h2 className={styles.title}>
        اطلاعات خریدار
      </h2>


      <div className={styles.grid}>


        <div className={styles.field}>
          <label>نام</label>
          <input
            value={data.firstName}
            onChange={(e)=>
              updateField('firstName', e.target.value)
            }
          />
        </div>


        <div className={styles.field}>
          <label>نام خانوادگی</label>
          <input
            value={data.lastName}
            onChange={(e)=>
              updateField('lastName', e.target.value)
            }
          />
        </div>


        <div className={styles.field}>
          <label>شماره موبایل</label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e)=>
              updateField('phone', e.target.value)
            }
          />
        </div>


        <div className={styles.field}>
          <label>ایمیل (اختیاری)</label>
          <input
            type="email"
            value={data.email}
            onChange={(e)=>
              updateField('email', e.target.value)
            }
          />
        </div>


        <div className={styles.field}>
          <label>استان</label>

          <select
            value={data.province}
            onChange={(e)=>{
              onChange({
                ...data,
                province:e.target.value,
                city:'',
              });
            }}
          >

            <option value="">
              انتخاب استان
            </option>

            {provinces.map((item)=>(
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}

          </select>

        </div>


        <div className={styles.field}>
          <label>شهر</label>

          <select
            value={data.city}
            disabled={!data.province}
            onChange={(e)=>
              updateField('city',e.target.value)
            }
          >

            <option value="">
              انتخاب شهر
            </option>

            {cities.map((item)=>(
              <option
                key={item.id}
                value={item.name}
              >
                {item.name}
              </option>
            ))}

          </select>

        </div>


        <div className={styles.field}>
          <label>کد پستی</label>
          <input
            value={data.postalCode}
            onChange={(e)=>
              updateField('postalCode',e.target.value)
            }
          />
        </div>


        <div className={styles.field}>
          <label>تلفن ثابت (اختیاری)</label>
          <input
            value={data.landline}
            onChange={(e)=>
              updateField('landline',e.target.value)
            }
          />
        </div>


        <div className={`${styles.field} ${styles.full}`}>
          <label>آدرس</label>

          <textarea
            value={data.address}
            onChange={(e)=>
              updateField('address',e.target.value)
            }
          />

        </div>


        <div className={`${styles.field} ${styles.full}`}>
          <label>توضیحات (اختیاری)</label>

          <textarea
            value={data.description}
            onChange={(e)=>
              updateField('description',e.target.value)
            }
          />

        </div>


      </div>

    </section>
  );
}