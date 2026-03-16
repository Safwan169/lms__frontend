import { Button } from "@/components/ui/button"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import NotificationsIcon from '@mui/icons-material/NotificationsOutlined';
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";


export function Notification({ notifications }: { notifications: { id: number, title: string, message: string, time: string, unread: boolean }[] }) {
    return (
        <div className="flex flex-wrap gap-2  overflow-hidden">

            <Drawer

                direction={
                    "right"
                }
            >
                <DrawerTrigger asChild>
                    <Button style={{border:0}} variant="outline" className="capitalize">
                    <NotificationsIcon fontSize="small" />
                    </Button>
                </DrawerTrigger>
                <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[50vh] data-[vaul-drawer-direction=top]:max-h-[50vh] ">
                    <DrawerHeader>
                        <DrawerTitle>Notifications</DrawerTitle>
                        <DrawerDescription>
                            Your latest notifications.
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="no-scrollbar overflow-y-auto px-4">
                        {notifications.map((n) => (
                            <p
                                key={n.id}
                                className="mb-4 leading-normal style-lyra:mb-2 style-lyra:leading-relaxed"
                            >

                               
                                    <MenuItem key={n.id} sx={{
                                        alignItems: 'flex-start', gap: 1.5, py: 1.5,
                                        backgroundColor: n.unread ? 'action.hover' : 'transparent'
                                    }}>
                                        <Box
                                            sx={{
                                                width: 8, height: 8, borderRadius: '50%', mt: 0.8, flexShrink: 0,
                                                backgroundColor: n.unread ? 'primary.main' : 'transparent'
                                            }}
                                        />
                                        <Box>
                                            <Typography fontSize={13} fontWeight={600}>{n.title}</Typography>
                                            <Typography fontSize={12} color="text.secondary">{n.message}</Typography>
                                            <Typography fontSize={11} color="text.disabled" mt={0.3}>{n.time}</Typography>
                                        </Box>
                                    </MenuItem>
                        

                            </p>
                        ))}
                    </div>

                </DrawerContent>
            </Drawer>

        </div>
    )
}
