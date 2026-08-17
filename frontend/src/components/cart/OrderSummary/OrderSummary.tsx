import styles from './OrderSummary.module.css';
import type { CustomerData } from '../types';


interface OrderSummaryProps {
  subtotal:number;
  shipping:number;
  total:number;
  customer:CustomerData;
}


export function OrderSummary({
  subtotal,
  shipping,
  total,
  customer
}:OrderSummaryProps){


const formatPrice=(value:number)=>
new Intl.NumberFormat('fa-IR').format(value);



const giftLimit = 2000000;

const remaining = giftLimit - total;


return (

<aside className={styles.summary} dir="rtl">


<h2 className={styles.title}>
خلاصه سفارش
</h2>



<div className={styles.customerBox}>

<h3>
اطلاعات گیرنده
</h3>


<p>
{customer.firstName} {customer.lastName}
</p>


<p>
📱 {customer.phone}
</p>


<p>
📍 {customer.province && customer.city 
? `${customer.city}، ${customer.province}`
: 'آدرس وارد نشده'}
</p>


</div>




<div className={styles.rows}>


<div className={styles.row}>
<span>
مبلغ کالاها
</span>

<span>
{formatPrice(subtotal)} تومان
</span>

</div>



<div className={styles.row}>

<span>
هزینه ارسال
</span>


<span>
{
shipping===0
?
'رایگان'
:
formatPrice(shipping)+' تومان'
}

</span>

</div>



</div>



<div className={styles.divider}/>



<div className={styles.total}>

<span>
مبلغ نهایی
</span>


<span>
{formatPrice(total)} تومان
</span>


</div>




<div className={styles.gift}>


🎁


{
remaining<=0
?
'تبریک! یک هدیه ویژه برای سفارش شما فعال شد'
:
`فقط ${formatPrice(remaining)} تومان تا هدیه ویژه فاصله دارید`
}



</div>



<button className={styles.checkout}>

ثبت و پرداخت سفارش

</button>



</aside>

);

}