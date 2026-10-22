import { fireEvent, render, screen, within } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import { NativeCheckbox } from './native-checkbox'
import { NativeSelect } from './native-select'
import { DetailField, DetailSummary } from './detail-summary'
import { CountFreePagination } from './pagination-footer'
import { RecordPagination } from '../RecordPagination'
import { OrderStatusBadge, orderStatusTone } from '#/features/orders/OrderStatusBadge'
import { CustomerLocaleContext } from '#/features/customer-i18n/customer-text'

describe('standardized record controls',()=>{
  it('preserves native registered checked/value events and form submission',async()=>{
    const save=vi.fn()
    function Form(){const form=useForm({defaultValues:{verified:false,category:'a'}});return <form onSubmit={form.handleSubmit(save)}><label><NativeCheckbox {...form.register('verified')} />Reviewed</label><label>Category<NativeSelect {...form.register('category')}><option value="a">A</option><option value="b">B</option></NativeSelect></label><button type="submit">Save</button></form>}
    render(<Form />);fireEvent.click(screen.getByRole('checkbox',{name:'Reviewed'}));fireEvent.change(screen.getByRole('combobox',{name:'Category'}),{target:{value:'b'}});fireEvent.click(screen.getByRole('button',{name:'Save'}))
    await vi.waitFor(()=>expect(save).toHaveBeenCalledWith({verified:true,category:'b'},expect.anything()))
  })
  it('renders zero, false, missing and long values as accessible definition-list data',()=>{
    render(<DetailSummary><DetailField label="Count" value={0} /><DetailField label="Flag" value={false} /><DetailField label="Absent" value={null} /><DetailField label="Identifier" value={'EXAMPLE-'.repeat(40)} /></DetailSummary>)
    expect(screen.getByText('0').tagName).toBe('DD');expect(screen.getByText('No').closest('dd')).not.toBeNull();expect(screen.getByText('Not recorded').closest('dd')).not.toBeNull()
    expect(screen.getAllByRole('term')).toHaveLength(4)
  })
  it('localizes false for a Customer instead of treating it as a missing value',()=>{
    render(<CustomerLocaleContext.Provider value={{customer:true,pseudo:true,locale:'en-US'}}><DetailSummary><DetailField label="Recall flagged" value={false} /></DetailSummary></CustomerLocaleContext.Provider>)
    expect(screen.getByText(/\[Nø/).closest('dd')).not.toBeNull();expect(screen.queryByText('Not recorded')).toBeNull()
  })
  it('keeps count-free paging truthful and blocks duplicate/pending navigation',()=>{
    const onPage=vi.fn();const {rerender}=render(<CountFreePagination label="Retained pages" page={2} hasNext busy={false} onPage={onPage} />)
    const nav=screen.getByRole('navigation',{name:'Retained pages'});expect(nav.textContent).toContain('Page 2');expect(nav.textContent).not.toMatch(/of|records/)
    fireEvent.click(within(nav).getByRole('button',{name:'Previous'}));expect(onPage).toHaveBeenLastCalledWith(1)
    rerender(<CountFreePagination label="Retained pages" page={2} hasNext busy onPage={onPage} />)
    expect((within(nav).getByRole('button',{name:'Next'}) as HTMLButtonElement).disabled).toBe(true)
  })
  it('offers first-page recovery when a counted URL is beyond the current last page',()=>{
    const onPage=vi.fn();render(<RecordPagination label="Records" data={{page:9,pageSize:10,totalCount:12}} busy={false} onPage={onPage} />)
    fireEvent.click(screen.getByRole('button',{name:'First page'}));expect(onPage).toHaveBeenCalledWith(1)
  })
  it('distinguishes cancelled, failed, review and released without guessing from unknown labels',()=>{
    expect(orderStatusTone('Cancelled')).toBe('neutral');expect(orderStatusTone('Failed')).toBe('error');expect(orderStatusTone('OutputReview')).toBe('pending');expect(orderStatusTone('Released')).toBe('success');expect(orderStatusTone('NewPendingFailureReview')).toBe('neutral')
    render(<OrderStatusBadge status="Cancelled" />);expect(screen.getByText('Cancelled').getAttribute('data-tone')).toBe('neutral')
  })
})
