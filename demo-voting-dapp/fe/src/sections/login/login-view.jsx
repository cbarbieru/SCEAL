import {useState} from 'react';

import {
    Box,
    Card,
    Divider,
    FormControl,
    FormHelperText,
    IconButton,
    InputAdornment,
    InputLabel,
    Link,
    OutlinedInput,
    Stack,
    Typography
} from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';

import * as Yup from 'yup';
import {Formik} from 'formik';

import {alpha, useTheme} from '@mui/material/styles';

import {useRouter} from 'src/routes/hooks';

import {bgGradient} from 'src/theme/css';

import Logo from 'src/components/logo';
import Iconify from 'src/components/iconify';

import AuthService from "src/services/auth.service";

export default function LoginView() {
    const theme = useTheme();

    const router = useRouter();

    const [showPassword, setShowPassword] = useState(false);

    const loginForm = (
        <Formik
            initialValues={{
                pin: '',
                password: '',
                submit: null
            }}
            validationSchema={Yup.object().shape({
                pin: Yup.string().min(10).max(100).required('Personal Identification number is required!'),
                password: Yup.string().min(5).max(50).required('Password is required!')
            })}
            onSubmit={(values, {setErrors, setStatus}) => {
                return AuthService.login(values.pin, values.password).then(
                    () => {
                        router.push('/');
                    },
                    (error) => {
                        const resMessage =
                            (error.response &&
                                error.response.data &&
                                error.response.data.message) ||
                            error.message ||
                            error.toString();

                        setStatus({success: false});
                        setErrors({ submit:resMessage });
                    }
                );
            }}
        >
            {({errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values}) => (
                <form noValidate onSubmit={handleSubmit}>
                    <fieldset disabled={isSubmitting} style={{border: 0}}>
                        <FormControl fullWidth margin="normal" error={Boolean(touched.pin && errors.pin)}
                                     sx={{...theme.typography.customInput}}>
                            <InputLabel htmlFor="pin-login">Personal Identification Number</InputLabel>
                            <OutlinedInput
                                id="pin-login"
                                type="text"
                                value={values.pin || ''}
                                label="Personal Identification Number"
                                onBlur={handleBlur}
                                onChange={handleChange}
                                name="pin"
                                inputProps={{}}
                            />
                            {touched.pin && errors.pin && (
                                <FormHelperText error id="errtext-pin">
                                    {errors.pin}
                                </FormHelperText>
                            )}
                        </FormControl>
                        <FormControl fullWidth margin="normal" error={Boolean(touched.password && errors.password)}
                                     sx={{...theme.typography.customInput}}>
                            <InputLabel htmlFor="password-login">Password</InputLabel>
                            <OutlinedInput
                                id="password-login"
                                type={showPassword ? 'text' : 'password'}
                                value={values.password || ''}
                                name="password"
                                label="Password"
                                onBlur={handleBlur}
                                onChange={(e) => {
                                    handleChange(e);
                                }}
                                endAdornment={
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                            size="large"
                                        >
                                            <Iconify icon={showPassword ? 'eva:eye-fill' : 'eva:eye-off-fill'}/>
                                        </IconButton>
                                    </InputAdornment>
                                }
                                inputProps={{}}
                            />
                            {touched.password && errors.password && (
                                <FormHelperText error id="standard-weight-helper-text-password-login">
                                    {errors.password}
                                </FormHelperText>
                            )}
                        </FormControl>

                        {errors.submit && (
                            <Box sx={{mt: 3}}>
                                <FormHelperText error><b>{errors.submit}</b></FormHelperText>
                            </Box>
                        )}

                    </fieldset>
                    <Box sx={{mt: 2}}>
                        <LoadingButton
                            fullWidth
                            size="large"
                            type="submit"
                            variant="contained"
                            color="inherit"
                            loading={isSubmitting}
                            sx={{mt: 2}}
                            disabled={Boolean(touched.pin && errors.pin) || Boolean(touched.password && errors.password)}>
                            Login
                        </LoadingButton>
                    </Box>
                </form>
            )}
        </Formik>
    );

    return (
        <Box
            sx={{
                ...bgGradient({
                    color: alpha(theme.palette.background.default, 0.9),
                    imgUrl: '/assets/background/overlay_4.jpg',
                }),
                height: 1,
            }}
        >
            <Logo
                sx={{
                    position: 'fixed',
                    top: {xs: 16, md: 24},
                    left: {xs: 16, md: 24},
                }}
            />

            <Stack alignItems="center" justifyContent="center" sx={{height: 1}}>
                <Card
                    sx={{
                        p: 5,
                        width: 1,
                        maxWidth: 420,
                    }}
                >
                    <Typography variant="h4">Sign in to Online Voting</Typography>

                    <Typography variant="body2" sx={{mt: 2, mb: 5}}>
                        Don’t have an account?
                        <Link variant="subtitle2" sx={{ml: 0.5, cursor: 'pointer'}} onClick={() => {
                            router.push('/register')
                        }}>
                            Get started
                        </Link>
                    </Typography>

                    <Divider sx={{my: 3}}>
                        <Typography variant="body2" sx={{color: 'text.secondary'}}>
                            OR
                        </Typography>
                    </Divider>

                    {loginForm}
                </Card>
            </Stack>
        </Box>
    );
}