import { FC, useState, useEffect } from 'react'
import {
  Button,
  Loading,
  IconFileText,
  IconDownload,
  IconChevronLeft,
  IconChevronRight,
} from '@supabase/ui'
import { PermissionAction } from '@supabase/shared-types/out/constants'

import { checkPermissions, useStore } from 'hooks'
import { API_URL } from 'lib/constants'
import { get, head } from 'lib/common/fetch'
import Table from 'components/to-be-cleaned/Table'
import NoPermission from 'components/ui/NoPermission'

const PAGE_LIMIT = 10

/**
 * Eventually deprecate this - as we move on to show invoices by project on the organization billing page
 */

interface Props {
  organization: any
}

const InvoicesSettings: FC<Props> = ({ organization }) => {
  const { ui } = useStore()
  const [loading, setLoading] = useState<any>(false)

  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [invoices, setInvoices] = useState<any>([])

  const { stripe_customer_id } = organization
  const offset = (page - 1) * PAGE_LIMIT

  const canReadInvoices = checkPermissions(PermissionAction.READ, 'invoices')

  useEffect(() => {
    if (!canReadInvoices) return

    let cancel = false
    const page = 1

    const fetchInvoiceCount = async () => {
      const res = await head(`${API_URL}/stripe/invoices?customer=${stripe_customer_id}`, [
        'X-Total-Count',
      ])
      if (!cancel) {
        if (res.error) {
          ui.setNotification({ category: 'error', message: res.error.message })
        } else {
          setCount(res['X-Total-Count'])
        }
      }
    }

    setPage(page)
    fetchInvoices(page)
    fetchInvoiceCount()

    return () => {
      cancel = true
    }
  }, [stripe_customer_id])

  const fetchInvoices = async (page: number) => {
    setLoading(true)
    setPage(page)

    const offset = (page - 1) * PAGE_LIMIT
    const invoices = await get(
      `${API_URL}/stripe/invoices?offset=${offset}&limit=${PAGE_LIMIT}&customer=${stripe_customer_id}`
    )

    if (invoices.error) {
      ui.setNotification({ category: 'error', message: invoices.error.message })
    } else {
      setInvoices(invoices)
    }

    setLoading(false)
  }

  const fetchInvoice = async (invoiceId: string) => {
    const invoice = await get(`${API_URL}/stripe/invoices/${invoiceId}`)
    if (invoice?.invoice_pdf) {
      window.open(invoice.invoice_pdf, '_blank')
    } else {
      ui.setNotification({
        category: 'info',
        message: 'Unable to fetch the selected invoice',
      })
    }
  }

  if (!canReadInvoices) {
    return <NoPermission resourceText="view invoices" />
  }

  return (
    <div className="my-4 container max-w-4xl space-y-1">
      <Loading active={loading}>
        <Table
          head={[
            <Table.th key="header-icon"></Table.th>,
            <Table.th key="header-date">Date</Table.th>,
            <Table.th key="header-amount">Amount due</Table.th>,
            <Table.th key="header-invoice">Invoice number</Table.th>,
            <Table.th key="header-download" className="text-right"></Table.th>,
          ]}
          body={
            invoices.length === 0 ? (
              <Table.tr>
                <Table.td colSpan={5} className="p-3 py-12 text-center">
                  <p className="text-scale-1000">
                    {loading ? 'Checking for invoices' : 'No invoices for this organization yet'}
                  </p>
                </Table.td>
              </Table.tr>
            ) : (
              <>
                {invoices.map((x: any) => {
                  return (
                    <Table.tr key={x.id}>
                      <Table.td>
                        <IconFileText size="xxl" />
                      </Table.td>
                      <Table.td>
                        <p>{new Date(x.period_end * 1000).toLocaleString()}</p>
                      </Table.td>
                      <Table.td>
                        <p>${x.subtotal / 100}</p>
                      </Table.td>
                      <Table.td>
                        <p>{x.number}</p>
                      </Table.td>
                      <Table.td className="align-right">
                        <div className="flex items-center space-x-2 justify-end">
                          <Button
                            type="outline"
                            icon={<IconDownload />}
                            onClick={() => fetchInvoice(x.id)}
                          />
                        </div>
                      </Table.td>
                    </Table.tr>
                  )
                })}
                <Table.tr key="navigation">
                  <Table.td colSpan={5}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm opacity-50">
                        Showing {offset + 1} to {offset + invoices.length} out of {count} invoices
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button
                          icon={<IconChevronLeft />}
                          type="default"
                          size="tiny"
                          disabled={page === 1}
                          onClick={async () => await fetchInvoices(page - 1)}
                        />
                        <Button
                          icon={<IconChevronRight />}
                          type="default"
                          size="tiny"
                          disabled={page * PAGE_LIMIT >= count}
                          onClick={async () => await fetchInvoices(page + 1)}
                        />
                      </div>
                    </div>
                  </Table.td>
                </Table.tr>
              </>
            )
          }
        />
      </Loading>
    </div>
  )
}

export default InvoicesSettings
