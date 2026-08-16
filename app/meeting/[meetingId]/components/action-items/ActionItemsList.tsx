import { Integration } from '../../hooks/useActionItems'
import ActionItemRow from './ActionItemRow'

interface ActionItemsListProps {
    actionItems: { id: number; text: string }[]
    integrations: Integration[]
    loading: { [key: string]: boolean }
    addToIntegration: (platform: string, item: { id: number; text: string }) => void
    handleDeleteItem: (id: number) => void
}

export default function ActionItemsList(props: ActionItemsListProps) {
    return (
        <div>
            {props.actionItems.map((item, index) => (
                <ActionItemRow
                    key={item.id}
                    index={index}
                    item={item}
                    integrations={props.integrations}
                    loading={props.loading}
                    addToIntegration={props.addToIntegration}
                    handleDeleteItem={props.handleDeleteItem}
                />
            ))}
        </div>
    )
}
