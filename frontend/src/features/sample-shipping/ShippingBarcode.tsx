// Code 128 symbol widths, cross-checked against ZXing's Apache-2.0 reference:
// https://github.com/zxing/zxing/blob/master/core/src/main/java/com/google/zxing/oned/Code128Reader.java
const widths = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
  '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
  '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
  '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
  '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
  '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
  '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
  '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
  '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
  '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
  '114131','311141','411131','211412','211214','211232','2331112',
]

export function encodeShippingBarcode(value: string) {
  if (!value || !/^[\x20-\x7e]+$/.test(value)) return null
  const data = [...value].map(character => character.charCodeAt(0) - 32)
  const checksum = data.reduce((sum, code, index) => sum + code * (index + 1), 104) % 103
  return [104, ...data, checksum, 106].map(code => widths[code]).map(pattern =>
    [...pattern].map((width, index) => (index % 2 ? '0' : '1').repeat(Number(width))).join(''),
  ).join('')
}

export function ShippingBarcode({ value, label = 'Barcode' }: { value: string; label?: string }) {
  const encoded = encodeShippingBarcode(value)
  if (!encoded) return <p className="text-sm text-destructive">The barcode graphic is unavailable. Contact Phaeno with this identifier: {value}</p>
  const modules = `0000000000${encoded}0000000000`
  return <figure className="shipping-barcode min-w-0 space-y-1" style={{ width: `min(100%, ${modules.length * 0.26}mm)` }}>
    <svg aria-label={`${label} ${value}`} className="h-12 w-full print:h-[7mm]" role="img" viewBox={`0 0 ${modules.length} 48`} preserveAspectRatio="none">
      <rect fill="white" height="48" width={modules.length} />
      {[...modules].map((module, index) => module === '1' ? <rect fill="black" height="48" key={index} width="1" x={index} /> : null)}
    </svg>
    <figcaption className="wrap-anywhere text-center font-mono text-xs">{value}</figcaption>
  </figure>
}
