import styles from './OrderSummary.module.css';


interface OrderSummaryProps {

  subtotal:number;

  shipping:number;

  total:number;

}



export function OrderSummary({

  subtotal,

  shipping,

  total

}:OrderSummaryProps){



const formatPrice=(value:number)=>

new Intl.NumberFormat('fa-IR').format(value);



return (

<aside 
className={styles.summary}
>



<h2 className={styles.title}>
Order Summary
</h2>



<div className={styles.rows}>


<div className={styles.row}>

<span>
Subtotal
</span>

<span>
{formatPrice(subtotal)}
</span>

</div>




<div className={styles.row}>

<span>
Shipping
</span>

<span>

{
shipping===0
?
'Free'
:
formatPrice(shipping)
}

</span>

</div>



</div>





<div className={styles.divider}/>




<div className={styles.total}>


<span>
Total
</span>


<span>
{formatPrice(total)}
</span>


</div>





<button className={styles.checkout}>

PROCEED TO CHECKOUT

</button>




</aside>


);

}
