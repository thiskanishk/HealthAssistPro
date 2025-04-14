import React, { useState } from 'react';
import {
    Box,
    Paper,
    Tabs,
    Tab,
    Typography,
    Grid,
    Card,
    CardContent,
    IconButton,
    Tooltip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    Description,
    LocalHospital,
    Science,
    Image,
    PictureAsPdf,
    Download,
    Visibility
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { getMedicalRecords } from '../../services/api/records';
import { PDFViewer } from '../common/PDFViewer';
import { ImageViewer } from '../common/ImageViewer';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel = (props: TabPanelProps) => {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
};

export const MedicalRecordsViewer: React.FC<{ patientId: string }> = ({ patientId }) => {
    const [tabValue, setTabValue] = useState(0);
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);

    const { data: records, isLoading } = useQuery(
        ['medicalRecords', patientId],
        () => getMedicalRecords(patientId)
    );

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleFileView = (file: any) => {
        setSelectedFile(file);
        setIsViewerOpen(true);
    };

    const renderFilePreview = (file: any) => {
        switch (file.type) {
            case 'pdf':
                return <PictureAsPdf color="error" />;
            case 'image':
                return <Image color="primary" />;
            default:
                return <Description color="action" />;
        }
    };

    return (
        <Paper elevation={3}>
            <Tabs
                value={tabValue}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
            >
                <Tab icon={<LocalHospital />} label="Clinical Records" />
                <Tab icon={<Science />} label="Lab Results" />
                <Tab icon={<Image />} label="Imaging" />
                <Tab icon={<Description />} label="Reports" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                    {records?.clinicalRecords.map((record: any) => (
                        <Grid item xs={12} md={6} key={record.id}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6">
                                        {record.title}
                                    </Typography>
                                    <Typography color="textSecondary" gutterBottom>
                                        Date: {format(new Date(record.date), 'PPP')}
                                    </Typography>
                                    <Typography variant="body2" paragraph>
                                        Doctor: Dr. {record.doctor}
                                    </Typography>
                                    <Box display="flex" justifyContent="flex-end" gap={1}>
                                        <Tooltip title="View">
                                            <IconButton onClick={() => handleFileView(record)}>
                                                <Visibility />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Download">
                                            <IconButton>
                                                <Download />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </TabPanel>

            {/* Similar structure for other tabs */}

            <Dialog
                open={isViewerOpen}
                onClose={() => setIsViewerOpen(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>{selectedFile?.title}</DialogTitle>
                <DialogContent>
                    {selectedFile?.type === 'pdf' ? (
                        <PDFViewer url={selectedFile.url} />
                    ) : selectedFile?.type === 'image' ? (
                        <ImageViewer url={selectedFile.url} />
                    ) : (
                        <Typography>Unsupported file type</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsViewerOpen(false)}>Close</Button>
                    <Button variant="contained" startIcon={<Download />}>
                        Download
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}; 