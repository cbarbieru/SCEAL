import { useState } from 'react';
import Typography from '@mui/material/Typography';

import {
  Box,
  Link,
  Card,
  Stack,
  Divider,
  InputLabel,
  IconButton,
  Grid,
  OutlinedInput,
  FormHelperText,
  FormControl,
  Alert
} from '@mui/material';

import LoadingButton from '@mui/lab/LoadingButton';
import { alpha, useTheme } from '@mui/material/styles';
import InputAdornment from '@mui/material/InputAdornment';
import SelectField from 'src/components/form/SelectField'
import { useRouter } from 'src/routes/hooks';
import { strengthColor, strengthIndicator } from 'src/utils/password-strength.js';
import { bgGradient } from 'src/theme/css';
import * as Yup from 'yup';
import { Formik, Field } from 'formik';

import Logo from 'src/components/logo';
import Iconify from 'src/components/iconify';

import citiesByRegion from '../../resources/orase-dupa-judet.min.json';
import { usePost } from 'src/api/hooks/usePost';
import config from 'src/api/config';

const regions = Object.keys(citiesByRegion);

const createSelectOptions = (options) => {
  return options.map((option) => ({ value: option, label: option }));
}

export default function RegisterView() {
  const theme = useTheme();

  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState(0);
  const [level, setLevel] = useState({});
  const [redirectingToHomepage, setRedirectingToHomepage] = useState(false);

  const [registerSuccess, setRegisterSuccess] = useState(false);
  const { postData, isLoading } = usePost();

  const changePassword = (value) => {
    const temp = strengthIndicator(value);
    setStrength(temp);
    setLevel(strengthColor(temp));
  };

  const redirectToHomepage = () => {
    setRedirectingToHomepage(true);
    setTimeout(() => {
      router.push('/');
      setRedirectingToHomepage(false);
    }, 3000)
  };

  const registerForm = (
    <Formik
      initialValues={{
        pin: '',
        name: '',
        email: '',
        region: '',
        city: '',
        password: '',
        submit: null
      }}
      validationSchema={Yup.object().shape({
        pin: Yup.string().min(10, "Personal Identification number needs to be have at least 10 digits").max(100).required('Personal Identification number is required!'),
        name: Yup.string().min(10).max(200).required('Name is required!'),
        email: Yup.string().email('Must be a valid email').max(100).required('Email is required!'),
        password: Yup.string().min(5).max(50).required('Password is required!')
      })}
      onSubmit={(values, { setErrors, setStatus }) => {
        return postData(config.api(config.paths.register), values).then(response => {
            if (response.ok) {
                setStatus({success: true});
                setRegisterSuccess(true);
                redirectToHomepage();
            } else {
                const err = response.json.message;
                console.error("Error when submitting register form:" + err);
                setStatus({success: false});
                setErrors({submit: err});
                setRegisterSuccess(false);
            }
        });
      }}
    >
      {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values }) => (
        <form noValidate onSubmit={handleSubmit}>
          <fieldset disabled={isSubmitting || redirectingToHomepage} style={{border: 0}}>
              <FormControl fullWidth margin="normal" error={Boolean(touched.pin && errors.pin)} sx={{ ...theme.typography.customInput }}>
                <InputLabel htmlFor="pin-register">Personal Identification Number</InputLabel>
                <OutlinedInput
                  id="pin-register"
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
              <FormControl fullWidth margin="normal" error={Boolean(touched.password && errors.password)} sx={{ ...theme.typography.customInput }}>
                <InputLabel htmlFor="password-register">Password</InputLabel>
                <OutlinedInput
                  id="password-register"
                  type={showPassword ? 'text' : 'password'}
                  value={values.password || ''}
                  name="password"
                  label="Password"
                  onBlur={handleBlur}
                  onChange={(e) => {
                    handleChange(e);
                    changePassword(e.target.value);
                  }}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="large"
                      >
                        <Iconify icon={showPassword ? 'eva:eye-fill' : 'eva:eye-off-fill'} />
                      </IconButton>
                    </InputAdornment>
                  }
                  inputProps={{}}
                />
                {touched.password && errors.password && (
                  <FormHelperText error id="standard-weight-helper-text-password-register">
                    {errors.password}
                  </FormHelperText>
                )}
              </FormControl>
              {strength !== 0 && (
                <FormControl fullWidth margin="normal">
                  <Box sx={{ mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item>
                        <Box style={{ backgroundColor: level?.color }} sx={{ width: 85, height: 8, borderRadius: '7px' }} />
                      </Grid>
                      <Grid item>
                        <Typography variant="subtitle1" fontSize="0.75rem">
                          {level?.label}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </FormControl>
              )}

              <FormControl fullWidth margin="normal" error={Boolean(touched.name && errors.name)} sx={{ ...theme.typography.customInput }}>
                <InputLabel htmlFor="name-register">Name</InputLabel>
                <OutlinedInput
                  id="name-register"
                  type="text"
                  value={values.name || ''}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  label="Name"
                  name="name"
                  inputProps={{}}
                />
                {touched.name && errors.name && (
                  <FormHelperText error id="errtext-name">
                    {errors.name}
                  </FormHelperText>
                )}
              </FormControl>
              <FormControl fullWidth margin="normal" error={Boolean(touched.email && errors.email)} sx={{ ...theme.typography.customInput }}>
                <InputLabel htmlFor="email-register">Email Address</InputLabel>
                <OutlinedInput
                  id="email-register"
                  type="email"
                  value={values.email || ''}
                  name="email"
                  label="Email Address"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  inputProps={{}}
                />
                {touched.email && errors.email && (
                  <FormHelperText error id="errtext-email">
                    {errors.email}
                  </FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth margin="normal" error={Boolean(touched.region && errors.region)} sx={{ ...theme.typography.customInput }}>
                <Field name="region" component={SelectField} options={createSelectOptions(regions)} />
                {touched.region && errors.region && (
                  <FormHelperText error id="errtext-region">
                    {errors.region}
                  </FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth margin="normal" disabled={!values.region} error={Boolean(touched.city && errors.city)} sx={{ ...theme.typography.customInput }}>
                <Field name="city" component={SelectField} options={values.region ? createSelectOptions(citiesByRegion[values.region]) : []} />
                {touched.city && errors.city && (
                  <FormHelperText error id="errtext-city">
                    {errors.city}
                  </FormHelperText>
                )}
              </FormControl>
            </fieldset>
          {errors.submit && (
            <Box sx={{ mt: 3 }}>
              <FormHelperText error><b>{errors.submit}</b></FormHelperText>
            </Box>
          )}

          <Box sx={{ mt: 2 }}>
            <LoadingButton
              fullWidth
              size="large"
              type="submit"
              variant="contained"
              color="inherit"
              loading={isLoading}
              sx={{ mt: 2 }}
              disabled={
                Boolean(touched.pin && errors.pin)
                || Boolean(touched.name && errors.name)
                || Boolean(touched.email && errors.email)
                ||Boolean(touched.password && errors.password)}>
              Register
            </LoadingButton>
          </Box>
        </form>
      )}
    </Formik>
  );

  const registerStack = (
    <div>
      <Typography variant="h4">Register to Online Voting</Typography>

      <Typography variant="body2" sx={{ mt: 2, mb: 3 }}>
        Already have an account?
        <Link variant="subtitle2" sx={{ ml: 0.5, cursor: 'pointer' }} onClick={() => { router.push('/login') }}>
          Login
        </Link>
      </Typography>

      <Divider sx={{ my: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          OR
        </Typography>
      </Divider>
      <div>
        <Grid container direction="column" justifyContent="flex-end" sx={{ minHeight: '100vh+300px' }}>
          <Grid item xs={12}>
            {registerForm}
          </Grid>
        </Grid>
      </div>
    </div>);

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
          top: { xs: 16, md: 24 },
          left: { xs: 16, md: 24 },
        }}
      />

      <Stack alignItems="center" justifyContent="center" sx={{ height: 1 }}>
        <Card
          sx={{
            p: registerSuccess ? 3 : 4,
            width: 1,
            maxWidth: !registerSuccess ? 500 : 650,
             overflow: 'visible'
          }}
        >
          {
            !registerSuccess ? registerStack
              : <div>
                <Alert severity="success"
                  sx={{
                    border: '0.6px rgba(164,255,164,1.000) solid',
                    fontSize: '18px'
                  }}>
                  <b>Registration Successful! You will be redirected to the home page in 3 seconds.</b>
                </Alert>
              </div>
          }
        </Card>
      </Stack>
    </Box>
  );
}